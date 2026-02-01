# Render Deployment Guide for AssurePro AI

## 🚀 Quick Deploy to Render (5 Minutes)

### Method 1: One-Click Blueprint Deploy (Easiest)

1. **Go to [Render Dashboard](https://dashboard.render.com/)**
2. Click **"New +"** → **"Blueprint"**
3. Connect your GitHub repository: `rupeshmahto-design/assureai`
4. Render will detect `render.yaml` and create:
   - PostgreSQL database
   - Backend API service
   - Frontend static site
5. Click **"Apply"** and wait 5-10 minutes

That's it! Render automatically:
- ✅ Creates PostgreSQL database
- ✅ Deploys backend with environment variables
- ✅ Deploys frontend with correct API URL
- ✅ Connects everything together

---

### Method 2: Manual Setup (More Control)

#### Step 1: Create PostgreSQL Database

1. **Dashboard** → **New +** → **PostgreSQL**
2. Name: `assureproai-db`
3. Database: `assureproai`
4. Plan: **Free**
5. Click **Create Database**
6. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Step 2: Deploy Backend

1. **Dashboard** → **New +** → **Web Service**
2. Connect repository: `rupeshmahto-design/assureai`
3. Configure:
   ```
   Name: assureproai-backend
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave empty)
   Environment: Node
   Build Command: cd backend && npm install
   Start Command: cd backend && npm start
   Plan: Free
   ```
4. **Advanced** → Add Environment Variables:
   ```
   DATABASE_URL = (paste Internal Database URL)
   NODE_ENV = production
   PORT = 10000
   ```
5. Click **Create Web Service**
6. Wait for deployment (3-5 minutes)
7. Copy your backend URL (e.g., `https://assureproai-backend.onrender.com`)

#### Step 3: Deploy Frontend

1. **Dashboard** → **New +** → **Static Site**
2. Connect same repository: `rupeshmahto-design/assureai`
3. Configure:
   ```
   Name: assureproai-frontend
   Branch: main
   Build Command: npm install && npm run build
   Publish Directory: dist
   ```
4. **Advanced** → Add Environment Variable:
   ```
   VITE_API_URL = https://assureproai-backend.onrender.com
   ```
   (Use your backend URL from Step 2)
5. Click **Create Static Site**
6. Wait for build (2-3 minutes)

✅ **Done!** Access your app at: `https://assureproai-frontend.onrender.com`

---

## 🔧 Alternative: Deploy via CLI

```bash
# Install Render CLI
npm install -g render-cli

# Login
render login

# Deploy using blueprint
render blueprint launch
```

---

## 📝 What Gets Deployed

### Backend Service
- **URL**: `https://assureproai-backend.onrender.com`
- **Health Check**: `/health`
- **Auto-deploys**: On git push to main
- **Free tier**: Sleeps after 15 min inactivity (wakes in ~1 min)

### Frontend Static Site
- **URL**: `https://assureproai-frontend.onrender.com`
- **CDN**: Global distribution
- **Auto-deploys**: On git push to main
- **Free tier**: Always on

### PostgreSQL Database
- **Type**: Internal database
- **Storage**: 1GB free
- **Backups**: Not included in free tier
- **Connection**: Automatic via environment variable

---

## 🔑 Environment Variables

### Backend (Auto-configured by Blueprint)
```
DATABASE_URL = postgresql://... (from database)
NODE_ENV = production
PORT = 10000
```

### Frontend (Auto-configured by Blueprint)
```
VITE_API_URL = https://assureproai-backend.onrender.com
```

---

## ⚡ Post-Deployment

### Test Your Deployment

```bash
# Test backend health
curl https://assureproai-backend.onrender.com/health

# Test backend API
curl https://assureproai-backend.onrender.com/api/reports

# Visit frontend
open https://assureproai-frontend.onrender.com
```

### Configure Anthropic API Key

1. Visit your deployed frontend URL
2. Click **Settings** (⚙️ icon)
3. Enter your Anthropic API key
4. Click **Save**

---

## 🔄 Auto-Deploy on Git Push

Render automatically redeploys when you push to GitHub:

```bash
git add .
git commit -m "Update features"
git push origin main
# Render automatically deploys within 2-3 minutes
```

---

## 📊 Monitor Your Services

**Render Dashboard** shows:
- Build logs
- Runtime logs
- Metrics (CPU, Memory, Requests)
- Events
- Environment variables

---

## 💡 Free Tier Limitations

- **Backend**: Sleeps after 15 min inactivity (first request takes ~1 min to wake)
- **Database**: 1GB storage, 90 days retention
- **Build**: 500 build minutes/month
- **Bandwidth**: 100GB/month

### Upgrade to Paid ($7/month per service):
- No sleep
- More resources
- Custom domains
- Better performance

---

## 🆘 Troubleshooting

### Backend Won't Start?
```bash
# Check logs in Render Dashboard
# Verify DATABASE_URL is set
# Ensure PORT=10000
```

### Frontend Can't Connect?
```bash
# Check VITE_API_URL points to backend
# Verify backend is running (check health endpoint)
# Rebuild frontend after changing env vars
```

### Database Connection Failed?
```bash
# Use Internal Database URL (not External)
# Check database is running
# Verify connection string format
```

---

## 🎯 Next Steps

1. ✅ Deploy using Blueprint (recommended)
2. ✅ Test health endpoint
3. ✅ Configure Anthropic API key in UI
4. ✅ Upload documents and generate report
5. ✅ Export PDF and Excel matrix
6. ✅ Set up custom domain (optional, paid)

---

## 🌐 Custom Domain (Optional)

1. Go to frontend service → **Settings** → **Custom Domain**
2. Add your domain: `assureproai.yourdomain.com`
3. Update DNS records as instructed
4. SSL certificate auto-provisions

---

## 📱 Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- [Status Page](https://status.render.com)
