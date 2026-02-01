import express from 'express';
import { authMiddleware, checkPermission, requireOrgAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all users in organization (admin only)
router.get('/', authMiddleware, requireOrgAdmin, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT id, email, first_name, last_name, role, is_org_admin, email_verified, last_login_at, created_at
       FROM users
       WHERE organization_id = $1 AND deleted_at IS NULL
       ORDER BY created_at DESC`,
      [req.organizationId]
    );
    
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to get users' });
  }
});

// Create user invitation
router.post('/invite', authMiddleware, checkPermission('users.create'), async (req, res) => {
  try {
    const { email, role } = req.body;
    
    // Check if user already exists
    const existing = await req.db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Generate invitation token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Create invitation
    await req.db.query(
      `INSERT INTO invitations (organization_id, email, role, token, expires_at, invited_by)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days', $5)`,
      [req.organizationId, email, role, token, req.userId]
    );
    
    // Audit log
    await req.db.query(
      `INSERT INTO audit_log (organization_id, user_id, action, resource_type, details)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.organizationId, req.userId, 'user_invited', 'user', JSON.stringify({ email, role })]
    );
    
    // TODO: Send invitation email with token
    
    res.status(201).json({ 
      message: 'Invitation sent',
      invitationUrl: `${process.env.FRONTEND_URL}/accept-invitation?token=${token}`
    });
  } catch (error) {
    console.error('Invite user error:', error);
    res.status(500).json({ error: 'Failed to invite user' });
  }
});

// Update user
router.patch('/:id', authMiddleware, checkPermission('users.update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, role } = req.body;
    
    // Check if user exists in same organization
    const user = await req.db.query(
      'SELECT id FROM users WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL',
      [id, req.organizationId]
    );
    
    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user
    await req.db.query(
      `UPDATE users 
       SET first_name = COALESCE($1, first_name),
           last_name = COALESCE($2, last_name),
           role = COALESCE($3, role)
       WHERE id = $4`,
      [firstName, lastName, role, id]
    );
    
    // Audit log
    await req.db.query(
      `INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id, details)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.organizationId, req.userId, 'user_updated', 'user', id, JSON.stringify({ firstName, lastName, role })]
    );
    
    res.json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Delete user (soft delete)
router.delete('/:id', authMiddleware, checkPermission('users.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Soft delete
    await req.db.query(
      'UPDATE users SET deleted_at = NOW() WHERE id = $1 AND organization_id = $2',
      [id, req.organizationId]
    );
    
    // Revoke all sessions
    await req.db.query(
      'UPDATE sessions SET revoked_at = NOW() WHERE user_id = $1',
      [id]
    );
    
    // Audit log
    await req.db.query(
      `INSERT INTO audit_log (organization_id, user_id, action, resource_type, resource_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [req.organizationId, req.userId, 'user_deleted', 'user', id]
    );
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
