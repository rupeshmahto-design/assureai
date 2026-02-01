# AssurePro AI - Backend Setup Summary

## ✅ What's Been Created

### Backend Structure
```
backend/
├── server.js         - Express server with PostgreSQL
├── package.json      - Backend dependencies
└── .env.example      - Environment template
```

### Key Features
- **Express API** with CORS enabled
- **PostgreSQL** database with auto-table creation
- **RESTful endpoints**: GET, POST, DELETE for reports
- **JSONB storage** for flexible report data
- **Health check** endpoint at `/health`

### API Endpoints
- `GET /health` - Server health check
- `GET /api/reports` - Fetch all reports
- `GET /api/reports/:id` - Get single report
- `POST /api/reports` - Create new report
- `DELETE /api/reports/:id` - Delete report

### Database Schema
```sql
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  project_name VARCHAR(255) NOT NULL,
  project_number VARCHAR(100),
  project_stage VARCHAR(100),
  report JSONB NOT NULL,
  documents JSONB,
  view_mode VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
)
```

## 🚀 Setup Instructions

### 1. Configure Environment

Create `backend/.env`:
```env
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/assureproai
NODE_ENV=development
```

Update root `.env`:
```env
VITE_ANTHROPIC_API_KEY=your_key_here
VITE_API_URL=http://localhost:3001
```

### 2. Setup PostgreSQL

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL from https://www.postgresql.org/download/

# Create database
psql -U postgres
CREATE DATABASE assureproai;
\q
```

**Option B: Railway (Recommended)**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Create project with PostgreSQL
railway init
railway add

# Get connection string
railway variables
# Copy DATABASE_URL
```

### 3. Start Development

**Option 1: Separate Terminals**
```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend  
npm run dev
```

**Option 2: Use Start Script (Windows)**
```bash
start-dev.bat
```

## 📦 Railway Deployment

### Deploy Backend
```bash
# Link Railway project
railway link

# Set environment
railway variables set NODE_ENV=production

# Deploy
git add .
git commit -m "Add backend"
git push railway main

# Get backend URL
railway status
```

### Deploy Frontend to Vercel
```bash
npm i -g vercel
vercel

# Set environment variable:
# VITE_API_URL = <your_railway_backend_url>
```

## 🔧 Testing

**Test Backend:**
```bash
# Health check
curl http://localhost:3001/health

# Create report
curl -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -d '{"projectName":"Test","projectNumber":"P001","report":{}}'

# List reports
curl http://localhost:3001/api/reports
```

## 📝 Next Steps

1. ✅ Install PostgreSQL or create Railway project
2. ✅ Configure environment variables
3. ✅ Run `cd backend && npm start`
4. ✅ Run `npm run dev` (frontend)
5. ✅ Test creating a report in the UI
6. ✅ View report history
7. ✅ Deploy to Railway + Vercel

## ⚠️ Important Notes

- **Database Required**: Backend won't work without PostgreSQL
- **CORS**: Frontend URL must match (localhost:5173 for dev)
- **API URL**: Update in production to use Railway backend URL
- **Security**: Never commit `.env` files with real credentials
