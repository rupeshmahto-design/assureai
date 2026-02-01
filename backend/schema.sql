-- Multi-Tenant Database Schema for AssurePro AI
-- Version: 2.0 with Authentication and RBAC

-- Organizations (Tenants)
CREATE TABLE organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  domain VARCHAR(255),
  logo_url VARCHAR(500),
  sso_enabled BOOLEAN DEFAULT FALSE,
  sso_provider VARCHAR(50), -- 'saml', 'oauth', 'oidc'
  sso_config JSONB, -- Provider-specific configuration
  subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'starter', 'professional', 'enterprise'
  max_users INTEGER DEFAULT 5,
  max_reports INTEGER DEFAULT 50,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

-- Users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255), -- NULL if SSO-only user
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  avatar_url VARCHAR(500),
  role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin', 'manager', 'user'
  is_org_admin BOOLEAN DEFAULT FALSE,
  is_super_admin BOOLEAN DEFAULT FALSE, -- Platform super admin
  email_verified BOOLEAN DEFAULT FALSE,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP, -- Soft delete
  
  CONSTRAINT check_role CHECK (role IN ('admin', 'manager', 'user'))
);

-- Sessions (for JWT token management)
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  refresh_token_hash VARCHAR(255),
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Reports (updated with ownership)
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  project_name VARCHAR(255) NOT NULL,
  project_number VARCHAR(100),
  project_stage VARCHAR(100),
  report JSONB NOT NULL,
  documents JSONB,
  view_mode VARCHAR(50),
  is_shared BOOLEAN DEFAULT FALSE, -- Shared across org
  shared_with INTEGER[], -- Array of user IDs
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP -- Soft delete
);

CREATE INDEX idx_reports_org_id ON reports(organization_id);
CREATE INDEX idx_reports_created_by ON reports(created_by);
CREATE INDEX idx_reports_project_number ON reports(project_number);
CREATE INDEX idx_reports_created_at ON reports(created_at DESC);

-- Audit Log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL, -- 'login', 'create_report', 'delete_user', etc.
  resource_type VARCHAR(50), -- 'report', 'user', 'organization'
  resource_id INTEGER,
  details JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_org ON audit_log(organization_id, created_at DESC);
CREATE INDEX idx_audit_user ON audit_log(user_id, created_at DESC);

-- Invitations
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_invitation_role CHECK (role IN ('admin', 'manager', 'user'))
);

-- Permissions (for fine-grained access control)
CREATE TABLE permissions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  resource VARCHAR(50) NOT NULL, -- 'reports', 'users', 'settings'
  action VARCHAR(50) NOT NULL, -- 'create', 'read', 'update', 'delete'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Role Permissions (many-to-many)
CREATE TABLE role_permissions (
  id SERIAL PRIMARY KEY,
  role VARCHAR(50) NOT NULL,
  permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(role, permission_id)
);

-- API Keys (for programmatic access)
CREATE TABLE api_keys (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  key_hash VARCHAR(255) NOT NULL,
  key_prefix VARCHAR(20) NOT NULL, -- First 8 chars for identification
  last_used_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP
);

-- Notification Preferences
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  email_reports BOOLEAN DEFAULT TRUE,
  email_invitations BOOLEAN DEFAULT TRUE,
  email_security BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default permissions
INSERT INTO permissions (name, description, resource, action) VALUES
-- Reports
('reports.create', 'Create new reports', 'reports', 'create'),
('reports.read.own', 'Read own reports', 'reports', 'read'),
('reports.read.all', 'Read all reports in organization', 'reports', 'read'),
('reports.update.own', 'Update own reports', 'reports', 'update'),
('reports.update.all', 'Update all reports', 'reports', 'update'),
('reports.delete.own', 'Delete own reports', 'reports', 'delete'),
('reports.delete.all', 'Delete all reports', 'reports', 'delete'),
('reports.export', 'Export reports', 'reports', 'export'),

-- Users
('users.read', 'View users in organization', 'users', 'read'),
('users.create', 'Invite new users', 'users', 'create'),
('users.update', 'Update user profiles', 'users', 'update'),
('users.delete', 'Remove users', 'users', 'delete'),

-- Settings
('settings.read', 'View organization settings', 'settings', 'read'),
('settings.update', 'Update organization settings', 'settings', 'update'),
('settings.sso', 'Configure SSO', 'settings', 'update'),

-- Analytics
('analytics.read', 'View analytics and reports', 'analytics', 'read'),
('audit.read', 'View audit logs', 'audit', 'read');

-- Assign permissions to roles
-- Admin role
INSERT INTO role_permissions (role, permission_id)
SELECT 'admin', id FROM permissions;

-- Manager role
INSERT INTO role_permissions (role, permission_id)
SELECT 'manager', id FROM permissions 
WHERE name IN (
  'reports.create', 'reports.read.all', 'reports.update.all', 'reports.delete.all', 'reports.export',
  'users.read', 'analytics.read'
);

-- User role
INSERT INTO role_permissions (role, permission_id)
SELECT 'user', id FROM permissions 
WHERE name IN (
  'reports.create', 'reports.read.own', 'reports.update.own', 'reports.delete.own', 'reports.export'
);

-- Indexes for performance
CREATE INDEX idx_users_org ON users(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_sessions_user ON sessions(user_id) WHERE revoked_at IS NULL;
CREATE INDEX idx_reports_org_user ON reports(organization_id, created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_invitations_email ON invitations(email) WHERE accepted_at IS NULL;

-- Views for common queries
CREATE VIEW active_users AS
SELECT u.*, o.name as organization_name, o.slug as organization_slug
FROM users u
JOIN organizations o ON u.organization_id = o.id
WHERE u.deleted_at IS NULL AND o.deleted_at IS NULL;

CREATE VIEW user_report_counts AS
SELECT 
  u.id as user_id,
  u.email,
  u.organization_id,
  COUNT(r.id) as total_reports,
  COUNT(CASE WHEN r.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as reports_last_30_days
FROM users u
LEFT JOIN reports r ON u.id = r.created_by AND r.deleted_at IS NULL
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.email, u.organization_id;

-- Function to check user permission
CREATE OR REPLACE FUNCTION user_has_permission(
  p_user_id INTEGER,
  p_permission_name VARCHAR
) RETURNS BOOLEAN AS $$
DECLARE
  user_role VARCHAR;
  has_perm BOOLEAN;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM users WHERE id = p_user_id;
  
  -- Check if role has permission
  SELECT EXISTS(
    SELECT 1 
    FROM role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
    WHERE rp.role = user_role AND p.name = p_permission_name
  ) INTO has_perm;
  
  RETURN has_perm;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
