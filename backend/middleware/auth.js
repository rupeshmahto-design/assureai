import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '24h';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

export const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if session is revoked
    const session = await req.db.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND token_hash = $2 AND revoked_at IS NULL AND expires_at > NOW()',
      [decoded.userId, hashToken(token)]
    );
    
    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    // Get user details
    const user = await req.db.query(
      `SELECT u.*, o.slug as organization_slug, o.name as organization_name
       FROM users u
       JOIN organizations o ON u.organization_id = o.id
       WHERE u.id = $1 AND u.deleted_at IS NULL`,
      [decoded.userId]
    );
    
    if (user.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Attach user to request
    req.user = user.rows[0];
    req.userId = decoded.userId;
    req.organizationId = user.rows[0].organization_id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(500).json({ error: 'Authentication error' });
  }
};

export const checkPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      // Super admin bypasses all checks
      if (req.user.is_super_admin) {
        return next();
      }
      
      // Check if user has permission
      const result = await req.db.query(
        'SELECT user_has_permission($1, $2) as has_permission',
        [req.userId, permissionName]
      );
      
      if (!result.rows[0].has_permission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

export const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role) && !req.user.is_super_admin) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
};

export const requireOrgAdmin = (req, res, next) => {
  if (!req.user.is_org_admin && !req.user.is_super_admin) {
    return res.status(403).json({ error: 'Organization admin access required' });
  }
  next();
};

export const generateToken = (userId, organizationId) => {
  return jwt.sign(
    { userId, organizationId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const generateRefreshToken = (userId, organizationId) => {
  return jwt.sign(
    { userId, organizationId, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
};

function hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
