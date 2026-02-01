import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pkg from 'pg';
const { Pool } = pkg;

// Import routes
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());

// Attach database to request
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authentication routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);

// Note: Report routes will be updated to require authentication and organization scoping
// For now, keeping them public for backward compatibility during migration

// Get all reports (will be scoped to organization after migration)
app.get('/api/reports', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM reports ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Get report by ID
app.get('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM reports WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({ error: 'Failed to fetch report' });
  }
});

// Create new report
app.post('/api/reports', async (req, res) => {
  try {
    const { projectName, projectNumber, projectStage, report, documents, viewMode } = req.body;
    
    const result = await pool.query(
      `INSERT INTO reports 
       (project_name, project_number, project_stage, report, documents, view_mode, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
       RETURNING *`,
      [projectName, projectNumber, projectStage, JSON.stringify(report), JSON.stringify(documents), viewMode]
    );
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({ error: 'Failed to create report' });
  }
});

// Delete report
app.delete('/api/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM reports WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }
    
    res.json({ message: 'Report deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Error deleting report:', error);
    res.status(500).json({ error: 'Failed to delete report' });
  }
});

// Initialize database - basic reports table for backward compatibility
// Full schema should be applied using schema.sql migration
const initDb = async () => {
  try {
    // Check if full schema is applied
    const schemaCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'organizations'
      )
    `);
    
    if (!schemaCheck.rows[0].exists) {
      console.log('⚠️  Full schema not detected. Please run migration: psql $DATABASE_URL -f backend/schema.sql');
      console.log('Creating basic reports table for backward compatibility...');
      
      await pool.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id SERIAL PRIMARY KEY,
          project_name VARCHAR(255) NOT NULL,
          project_number VARCHAR(100),
          project_stage VARCHAR(100),
          report JSONB NOT NULL,
          documents JSONB,
          view_mode VARCHAR(50),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
    } else {
      console.log('✓ Full multi-tenant schema detected');
    }
    
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
};

initDb();

app.listen(port, () => {
  console.log(`Backend server running on port ${port}`);
});
