# Render Deployment Guide

## 🚀 Deploy to Render with Authentication

### Prerequisites
- GitHub repository updated with latest code
- Render account connected to GitHub

### Step 1: Push Code to GitHub

```bash
git add .
git commit -m "Add multi-tenant authentication system"
git push origin main
```

### Step 2: Deploy via Render Dashboard

1. Go to [render.com/dashboard](https://render.com/dashboard)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository: `rupeshmahto-design/assureai`
4. Render will automatically detect `render.yaml` and create:
   - PostgreSQL database (`assureproai-db`)
   - Backend API service (`assureproai-backend`)
   - Frontend static site (`assureproai-frontend`)

### Step 3: Environment Variables (Auto-Configured)

Render.yaml configures these automatically:

**Backend:**
- `NODE_ENV` = production
- `DATABASE_URL` = Auto-linked from PostgreSQL
- `PORT` = 10000
- `JWT_SECRET` = Auto-generated secure random value
- `FRONTEND_URL` = Auto-linked from frontend URL

**Frontend:**
- `VITE_API_URL` = Auto-linked from backend URL

### Step 4: Run Database Migration

After services are deployed:

**Option A: Using Render Shell (Recommended)**

1. Go to your backend service in Render dashboard
2. Click **"Shell"** tab
3. Run:
   ```bash
   node migrate.js
   ```

**Option B: Manually via psql**

1. Get your database connection string from Render dashboard
2. Run locally:
   ```bash
   export DATABASE_URL="your-render-postgres-url"
   psql $DATABASE_URL -f backend/schema.sql
   ```

### Step 5: Verify Deployment

1. **Backend Health Check:**
   - Visit: `https://assureproai-backend.onrender.com/health`
   - Should return: `{"status":"ok","timestamp":"..."}`

2. **Frontend:**
   - Visit: `https://assureproai-frontend.onrender.com`
   - You should see the login screen

3. **Database Schema:**
   - In Render Shell:
   ```bash
   psql $DATABASE_URL -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
   ```
   - Should list all 10+ tables

### Step 6: Create First Organization

1. Go to your frontend URL
2. Click **"Create one"** on login screen
3. Fill in registration form:
   - Organization Name
   - Your details
   - Email and password
4. Click **"Create Account"**

🎉 You're now deployed with multi-tenant authentication!

## 🔧 Troubleshooting

### "Organizations table does not exist"
- Migration hasn't run yet
- Access backend Shell in Render and run `node migrate.js`

### CORS Errors
- Check that `FRONTEND_URL` is set correctly in backend env vars
- Should be: `https://assureproai-frontend.onrender.com`

### Authentication Not Working
- Verify `JWT_SECRET` is set in backend env vars
- Check browser console for errors
- Verify backend `/auth/me` endpoint is accessible

### Database Connection Issues
- Check `DATABASE_URL` is linked correctly
- Verify PostgreSQL service is running
- Check backend logs for connection errors

## 📊 Monitoring

### Backend Logs
1. Go to backend service in Render
2. Click **"Logs"** tab
3. Look for:
   ```
   ✓ Full multi-tenant schema detected
   Backend server running on port 10000
   ```

### Frontend Build Logs
1. Go to frontend service in Render
2. Check for successful build:
   ```
   ✓ built in XXXms
   ```

## 🔄 Updates & Redeployment

Push to GitHub and Render auto-deploys:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Render will automatically:
1. Pull latest code
2. Rebuild services
3. Restart with zero downtime

## 🔐 Security Checklist

✅ JWT_SECRET is auto-generated (never in code)  
✅ DATABASE_URL is environment variable  
✅ CORS restricted to frontend domain  
✅ HTTPS enabled by default  
✅ Password hashing with bcrypt  
✅ SQL injection protection via parameterized queries  

## 🎯 Post-Deployment Tasks

1. **Test Authentication Flow**
   - Register → Login → Logout
   - Try creating reports
   - Access admin dashboard

2. **Invite Team Members**
   - Use admin dashboard to invite users
   - Note: Email requires SMTP config (optional)

3. **Configure SSO (Optional)**
   - Go to Admin → Settings
   - Configure SAML/OAuth providers

4. **Monitor Usage**
   - Check Render dashboard for metrics
   - Review audit logs in admin dashboard

## 📞 Support

If you encounter issues:
1. Check Render service logs
2. Verify environment variables
3. Confirm database migration ran successfully
4. Review browser console for frontend errors

---

Deployment typically takes 5-10 minutes for all services to be live.
