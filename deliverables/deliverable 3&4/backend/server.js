// Haq Halal - Islamic Finance Tracker
// server.js - Updated for Deliverable 3&4 with JWT Auth
// FAST-NU, Lahore — Spring 2026

require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');
const authenticateToken = require('./middleware/auth');
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Middleware
// ============================================
app.use(cors());
app.use(express.json());

// ============================================
// DB Config & Shared Pool
// ============================================
const config = {
    server: process.env.DB_SERVER,
    ...(process.env.DB_PORT && { port: parseInt(process.env.DB_PORT) }),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    },
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    }
};

// Connect once, share the pool across all routes
sql.connect(config).then(pool => {
    console.log('✅ Connected to SQL Server');
    app.set('dbPool', pool);
}).catch(err => {
    console.error('❌ DB connection failed:', err.message);
    process.exit(1);
});

// ============================================
// Public Routes (no auth required)
// ============================================
const authRoutes = require('./routes/auth');
app.use('/api/auth', authLimiter, authRoutes);  // strict rate limit on auth

// ============================================
// Protected Routes (JWT required)
// All routes below require: Authorization: Bearer <token>
// ============================================
app.use(apiLimiter); // general rate limit on all API routes
app.use('/api/users',        authenticateToken, require('./routes/users'));
app.use('/api/categories',   authenticateToken, require('./routes/categories'));
app.use('/api/accounts',     authenticateToken, require('./routes/accounts'));
app.use('/api/transactions', authenticateToken, require('./routes/transactions'));
app.use('/api/budgets',      authenticateToken, require('./routes/budgets'));
app.use('/api/recurring',    authenticateToken, require('./routes/recurring'));
app.use('/api/transfers',    authenticateToken, require('./routes/transfers'));
app.use('/api/tags',         authenticateToken, require('./routes/tags'));
app.use('/api/alerts',       authenticateToken, require('./routes/alerts'));
app.use('/api/dashboard',    authenticateToken, require('./routes/dashboard'));

// ============================================
// Root
// ============================================
app.get('/', (req, res) => {
    res.json({
        message: 'Haq Halal - Islamic Finance Tracker API',
        version: '3.0',
        status: 'running'
    });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err.message);
    res.status(500).json({ error: 'Something went wrong.' });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('Public endpoints:');
    console.log('  POST /api/auth/register');
    console.log('  POST /api/auth/login');
    console.log('');
    console.log('Protected endpoints (require Bearer token):');
    console.log('  GET  /api/auth/me');
    console.log('  *    /api/users');
    console.log('  *    /api/categories');
    console.log('  *    /api/accounts');
    console.log('  *    /api/transactions   (search, filter, pagination supported)');
    console.log('  *    /api/budgets');
    console.log('  *    /api/recurring');
    console.log('  *    /api/transfers');
    console.log('  *    /api/tags');
    console.log('  *    /api/alerts');
    console.log('  *    /api/dashboard');
});
