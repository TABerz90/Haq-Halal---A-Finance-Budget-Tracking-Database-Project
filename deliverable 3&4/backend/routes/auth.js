// routes/auth.js
// Handles user registration and login with JWT

const express = require('express');
const router = express.Router();
const sql = require('mssql');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Helper: get DB pool from app
function getPool(req) {
    return req.app.get('dbPool');
}

// ============================================
// POST /api/auth/register
// Body: { username, email, password, full_name, default_currency? }
// ============================================
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, full_name, default_currency } = req.body;

        // Basic validation
        if (!username || !email || !password || !full_name) {
            return res.status(400).json({ error: 'username, email, password, and full_name are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        const pool = getPool(req);

        // Check if username or email already exists
        const existing = await pool.request()
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(100), email)
            .query(`
                SELECT user_id 
                FROM Users 
                WHERE username = @username OR email = @email
            `);

        if (existing.recordset.length > 0) {
            return res.status(409).json({ error: 'Username or email already in use.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Insert new user
        const result = await pool.request()
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(100), email)
            .input('password_hash', sql.VarChar(255), password_hash)
            .input('full_name', sql.VarChar(100), full_name)
            .input('default_currency', sql.VarChar(3), default_currency || 'PKR')
            .query(`
                INSERT INTO Users (username, email, password_hash, full_name, default_currency)
                VALUES (@username, @email, @password_hash, @full_name, @default_currency);
                SELECT SCOPE_IDENTITY() AS user_id;
            `);

        const user_id = result.recordset[0].user_id;

        // Generate JWT
        const token = jwt.sign(
            { user_id, username, email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.status(201).json({
            message: 'User registered successfully.',
            token,
            user: { user_id, username, email, full_name }
        });

    } catch (err) {
        console.error('Register error:', err.message);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// ============================================
// POST /api/auth/login
// Body: { email, password }
// ============================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const pool = getPool(req);

        // Find user by email
        const result = await pool.request()
            .input('email', sql.VarChar(100), email)
            .query(`
                SELECT user_id, username, email, full_name, password_hash, default_currency
                FROM Users
                WHERE email = @email
            `);

        if (result.recordset.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = result.recordset[0];

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Update last_login timestamp
        await pool.request()
            .input('user_id', sql.Int, user.user_id)
            .query(`UPDATE Users SET last_login = GETDATE() WHERE user_id = @user_id`);

        // Sync budget alerts in the background — catches any overbudget situations
        // that existed before login without delaying the login response
        pool.request()
            .input('user_id', sql.Int, user.user_id)
            .execute('sp_syncBudgetAlerts')
            .catch(() => {});

        // Generate JWT
        const token = jwt.sign(
            { user_id: user.user_id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({
            message: 'Login successful.',
            token,
            user: {
                user_id: user.user_id,
                username: user.username,
                email: user.email,
                full_name: user.full_name,
                default_currency: user.default_currency
            }
        });

    } catch (err) {
        console.error('Login error:', err.message);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// ============================================
// GET /api/auth/me
// Returns currently logged-in user's profile
// Requires: Authorization: Bearer <token>
// ============================================
router.get('/me', require('../middleware/auth'), async (req, res) => {
    try {
        const pool = getPool(req);

        const result = await pool.request()
            .input('user_id', sql.Int, req.user.user_id)
            .query(`
                SELECT user_id, username, email, full_name, default_currency, created_at, last_login
                FROM Users
                WHERE user_id = @user_id
            `);

        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
