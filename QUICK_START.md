# Quick Start Guide - Multi-Tenant Authentication

## 🚀 Get Started in 5 Minutes

### Step 1: Generate JWT Secret

**Windows PowerShell:**
```powershell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))
```

**macOS/Linux:**
```bash
openssl rand -base64 32
```

Copy the output for the next step.

### Step 2: Configure Environment Variables

Create `backend/.env` with:

```env
DATABASE_URL=your-postgres-connection-string
JWT_SECRET=paste-your-generated-secret-here
FRONTEND_URL=http://localhost:5173
PORT=3001
NODE_ENV=development
```

### Step 3: Run Migration

```bash
cd backend
node migrate.js
```

Expected output:
```
✅ Migration completed successfully!
📋 Created tables: organizations, users, sessions...
```

### Step 4: Start Backend

```bash
npm start
```

### Step 5: Start Frontend

```bash
# In new terminal
cd ..  # Back to root
npm run dev
```

### Step 6: Create Your Account

1. Visit http://localhost:5173
2. You'll see the login screen
3. Click **"Create one"** link
4. Fill in the form:
   - **Organization Name**: Your company name
   - **First Name**: Your first name
   - **Last Name**: Your last name
   - **Email**: Your email address
   - **Password**: At least 8 characters
   - **Confirm Password**: Same password
5. Click **"Create Account"**

🎉 You're now logged in as an organization admin!

## 🎮 What You Can Do Now

### As the First User (Organization Admin)

You automatically get:
- ✅ Admin role
- ✅ Organization admin privileges
- ✅ Access to Admin Dashboard

Click the **"Admin"** button in the header to:

1. **Manage Users**
   - View all users in your organization
   - Invite new users (assign roles: Admin, Manager, User)
   - Delete users

2. **View Reports Tab**
   - Will show organization-wide reports (after report scoping is implemented)

3. **Analytics Dashboard**
   - Coming soon: User activity, report metrics

4. **Organization Settings**
   - Organization name and profile
   - SSO configuration (coming soon)

5. **Audit Log** (Super Admin only)
   - Track all actions in the system

### Testing Multi-User Features

**Invite a team member:**

1. Go to Admin Dashboard → Users tab
2. Click **"Invite User"**
3. Enter their email and select role:
   - **Admin**: Full organization access
   - **Manager**: Can view all reports, manage users
   - **User**: Can only view their own reports
4. Click **"Send Invitation"**

⚠️ Note: Email sending requires SMTP configuration. For now, copy the invitation URL from the API response.

## 🔐 Role Permissions

### Admin Role
- ✅ Create/read/update/delete reports (all)
- ✅ Manage users (create/read/update/delete)
- ✅ Access settings
- ✅ View analytics
- ✅ Export reports

### Manager Role
- ✅ Read all organization reports
- ✅ Create own reports
- ✅ Update/delete own reports
- ✅ View user list
- ✅ Export reports
- ❌ Delete other users' reports
- ❌ Change organization settings

### User Role
- ✅ Create reports
- ✅ Read own reports
- ✅ Update own reports
- ✅ Delete own reports
- ✅ Export own reports
- ❌ View other users' reports
- ❌ Access user management
- ❌ Access settings

## 🛠️ Troubleshooting

### "Authentication required" error
- Make sure JWT_SECRET is set in backend/.env
- Check that backend server is running
- Clear browser localStorage and try logging in again

### "Organizations table already exists"
- Migration was already run
- To force re-run: `node migrate.js --force` (⚠️ This will delete all data!)

### CORS errors
- Ensure FRONTEND_URL in backend/.env matches your frontend URL
- Default: `FRONTEND_URL=http://localhost:5173`

### "Failed to save report to database"
- Check that DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify network connectivity to database

## 📊 Understanding Your Database

After migration, you have:

**10 Tables:**
- `organizations` - Your tenants/companies
- `users` - All user accounts
- `sessions` - Active login sessions
- `reports` - Assessment reports (will be scoped soon)
- `audit_log` - Activity tracking
- `invitations` - Pending user invites
- `permissions` - Available permissions (14 total)
- `role_permissions` - Role-to-permission mappings
- `api_keys` - For programmatic access
- `notification_preferences` - Email settings

**2 Views:**
- `active_users` - Quick view of active users with org info
- `user_report_counts` - Report statistics per user

## 🔄 Next Steps

1. **Scope Reports to Organizations** (Task 8 in TODO list)
   - Update report endpoints to filter by organization_id
   - Add created_by to track report authors

2. **Implement SSO** (Task 9 in TODO list)
   - Add SAML/OAuth/OIDC provider integration
   - Build SSO configuration UI

3. **Email Setup** (Optional)
   - Configure SMTP in .env
   - Enable user invitation emails
   - Add password reset emails

## 📞 Need Help?

Check these files:
- `AUTHENTICATION_IMPLEMENTATION.md` - Full technical details
- `backend/MIGRATION_GUIDE.md` - Migration instructions
- `BUSINESS_DOCUMENTATION.md` - Business context

## 🎯 Quick Commands

```bash
# Backend commands
cd backend
npm install                    # Install dependencies
node migrate.js               # Run migration
node migrate.js --force       # Force re-run migration
npm start                     # Start server

# Frontend commands
npm run dev                   # Start dev server
npm run build                 # Build for production
npm run preview               # Preview production build

# Database commands
psql $DATABASE_URL            # Connect to database
psql $DATABASE_URL -c "SELECT * FROM organizations;"  # Query orgs
psql $DATABASE_URL -c "SELECT * FROM users;"          # Query users
```

---

Ready to build enterprise-grade multi-tenant AI applications! 🚀
