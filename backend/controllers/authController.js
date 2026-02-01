import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { body, validationResult } from 'express-validator';
import { generateToken, generateRefreshToken } from '../middleware/auth.js';

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Register new user
export const register = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('firstName').trim().notEmpty(),
  body('lastName').trim().notEmpty(),
  body('organizationName').optional().trim(),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password, firstName, lastName, organizationName } = req.body;
      
      // Check if user exists
      const existingUser = await req.db.query(
        'SELECT id FROM users WHERE email = $1',
        [email]
      );
      
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      
      // Create organization if new (first user becomes org admin)
      let organizationId;
      if (organizationName) {
        const slug = organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const org = await req.db.query(
          'INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id',
          [organizationName, slug]
        );
        organizationId = org.rows[0].id;
      } else {
        // Assign to default organization or require organization selection
        return res.status(400).json({ error: 'Organization name required' });
      }
      
      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create user
      const user = await req.db.query(
        `INSERT INTO users (organization_id, email, password_hash, first_name, last_name, role, is_org_admin)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, email, first_name, last_name, role, organization_id`,
        [organizationId, email, passwordHash, firstName, lastName, 'admin', true]
      );
      
      const newUser = user.rows[0];
      
      // Generate tokens
      const token = generateToken(newUser.id, organizationId);
      const refreshToken = generateRefreshToken(newUser.id, organizationId);
      
      // Store session
      await req.db.query(
        `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
        [newUser.id, hashToken(token), hashToken(refreshToken)]
      );
      
      // Audit log
      await req.db.query(
        `INSERT INTO audit_log (organization_id, user_id, action, resource_type, ip_address)
         VALUES ($1, $2, $3, $4, $5)`,
        [organizationId, newUser.id, 'user_registered', 'user', req.ip]
      );
      
      res.status(201).json({
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.first_name,
          lastName: newUser.last_name,
          role: newUser.role,
          organizationId: newUser.organization_id
        },
        token,
        refreshToken
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
];

// Login
export const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
  
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { email, password } = req.body;
      
      // Get user
      const result = await req.db.query(
        `SELECT u.*, o.name as organization_name, o.slug as organization_slug
         FROM users u
         JOIN organizations o ON u.organization_id = o.id
         WHERE u.email = $1 AND u.deleted_at IS NULL`,
        [email]
      );
      
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = result.rows[0];
      
      // Check if SSO is required
      if (user.password_hash === null) {
        return res.status(401).json({ error: 'Please use SSO to login' });
      }
      
      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Generate tokens
      const token = generateToken(user.id, user.organization_id);
      const refreshToken = generateRefreshToken(user.id, user.organization_id);
      
      // Store session
      await req.db.query(
        `INSERT INTO sessions (user_id, token_hash, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours')`,
        [user.id, hashToken(token), hashToken(refreshToken)]
      );
      
      // Update last login
      await req.db.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [user.id]
      );
      
      // Audit log
      await req.db.query(
        `INSERT INTO audit_log (organization_id, user_id, action, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.organization_id, user.id, 'user_login', req.ip, req.get('user-agent')]
      );
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          isOrgAdmin: user.is_org_admin,
          isSuperAdmin: user.is_super_admin,
          organizationId: user.organization_id,
          organizationName: user.organization_name,
          organizationSlug: user.organization_slug
        },
        token,
        refreshToken
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  }
];

// Logout
export const logout = async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      // Revoke session
      await req.db.query(
        'UPDATE sessions SET revoked_at = NOW() WHERE token_hash = $1',
        [hashToken(token)]
      );
    }
    
    // Audit log
    await req.db.query(
      `INSERT INTO audit_log (organization_id, user_id, action)
       VALUES ($1, $2, $3)`,
      [req.organizationId, req.userId, 'user_logout']
    );
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
};

// Refresh token
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
    
    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
    
    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }
    
    // Check session
    const session = await req.db.query(
      'SELECT * FROM sessions WHERE user_id = $1 AND refresh_token_hash = $2 AND revoked_at IS NULL',
      [decoded.userId, hashToken(refreshToken)]
    );
    
    if (session.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
    
    // Generate new tokens
    const newToken = generateToken(decoded.userId, decoded.organizationId);
    const newRefreshToken = generateRefreshToken(decoded.userId, decoded.organizationId);
    
    // Update session
    await req.db.query(
      `UPDATE sessions 
       SET token_hash = $1, refresh_token_hash = $2, expires_at = NOW() + INTERVAL '24 hours'
       WHERE id = $3`,
      [hashToken(newToken), hashToken(newRefreshToken), session.rows[0].id]
    );
    
    res.json({
      token: newToken,
      refreshToken: newRefreshToken
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ error: 'Token refresh failed' });
  }
};

// Get current user
export const getCurrentUser = async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
};
