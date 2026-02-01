<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# AssurePro AI - Project Assurance Platform

AI-powered project assurance platform that analyzes project documentation and provides comprehensive risk assessments, gap analysis, and benefits realization tracking.

## Features

- 🤖 **AI-Powered Analysis** - Claude Sonnet 4.5 for intelligent project assessment
- 📊 **Comprehensive Reports** - Dashboard and professional PDF-style views
- 📝 **Report History** - Store and manage historical assessments with PostgreSQL
- ⚙️ **Settings Management** - User-friendly API key configuration
- 🎯 **Benefits Tracking** - Monitor project outcomes and value delivery
- 🔍 **Gap Analysis** - Identify risks across 8 dimensions (Budget, Schedule, Requirements, etc.)

## Run Locally

**Prerequisites:** Node.js 18+, PostgreSQL

### 1. Install Dependencies

```bash
npm install
cd backend && npm install && cd ..
```

### 2. Configure Environment

Create `.env` in root:
```env
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key
VITE_API_URL=http://localhost:3001
```

Create `backend/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/assureproai
NODE_ENV=development
```

### 3. Setup Database

Make sure PostgreSQL is running, then start the backend (it auto-creates the table):
```bash
cd backend
npm start
```

### 4. Run Frontend

In a separate terminal:
```bash
npm run dev
```

Visit `http://localhost:5173`

## Deploy to Railway

### Backend Deployment

1. **Create Railway Account**: Sign up at [railway.app](https://railway.app)

2. **Create New Project**: 
   - Click "New Project"
   - Select "Provision PostgreSQL" 
   - Note the connection string

3. **Deploy Backend**:
   ```bash
   # Install Railway CLI
   npm i -g @railway/cli
   
   # Login
   railway login
   
   # Link project
   railway link
   
   # Set environment variables
   railway variables set DATABASE_URL=<your_postgresql_url>
   railway variables set NODE_ENV=production
   
   # Deploy
   git push railway main
   ```

4. **Note Backend URL**: After deployment, copy your backend URL (e.g., `https://your-app.railway.app`)

### Frontend Deployment

Option 1: **Vercel**
```bash
npm i -g vercel
vercel --prod
# Set VITE_API_URL to your Railway backend URL
```

Option 2: **Netlify**
```bash
npm i -g netlify-cli
npm run build
netlify deploy --prod --dir=dist
# Configure environment: VITE_API_URL=<railway_backend_url>
```

## Deploy to Render (Recommended)

### One-Click Blueprint Deploy

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New +** → **Blueprint**
3. Connect repository: `rupeshmahto-design/assureai`
4. Click **Apply** - Render auto-creates:
   - PostgreSQL database
   - Backend API
   - Frontend static site
5. Wait 5-10 minutes for deployment

**That's it!** Access at your generated Render URL.

### Manual Render Setup

See [RENDER_DEPLOY.md](RENDER_DEPLOY.md) for detailed instructions.

**Why Render?**
- ✅ Free PostgreSQL included
- ✅ Auto-configures environment
- ✅ Blueprint deploys both services
- ✅ Auto-deploys on git push
- ✅ Free SSL certificates

## Environment Variables

### Frontend (`.env`)
- `VITE_ANTHROPIC_API_KEY` - Anthropic Claude API key (optional if using UI settings)
- `VITE_API_URL` - Backend API URL

### Backend (`backend/.env`)
- `PORT` - Server port (default: 3001)
- `DATABASE_URL` - PostgreSQL connection string
- `NODE_ENV` - Environment (development/production)

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, PostgreSQL
- **AI**: Anthropic Claude Sonnet 4.5
- **PDF**: html2pdf.js
- **Charts**: Recharts

## Repository

https://github.com/rupeshmahto-design/assureai
