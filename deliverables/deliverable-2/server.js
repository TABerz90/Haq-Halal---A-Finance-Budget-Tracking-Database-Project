// Personal Finance Tracker - Node.js Backend API
// Deliverable 2 - Part 3: CRUD Operations
// FAST-NU, Lahore, Pakistan - Spring 2026

require('dotenv').config();
const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

const config = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_DATABASE,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        trustServerCertificate: true,
        encrypt: false,
    }
};

// Test database connection
sql.connect(config).then(pool => {
    console.log('✅ Connected to SQL Server successfully!');
    console.log(`📊 Database: haqhalal`);
    return pool;
}).catch(err => {
    console.error('❌ Database connection failed:');
    console.error('Error message:', err.message);
});

// ============================================
// USERS API - CRUD Operations
// ============================================

// CREATE - Add new user
app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password_hash, full_name, default_currency } = req.body;
        
        const pool = await sql.connect(config);
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
        
        res.status(201).json({
            message: 'User created successfully',
            user_id: result.recordset[0].user_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get all users
app.get('/api/users', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request().query('SELECT * FROM Users');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get user by ID
app.get('/api/users/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.id)
            .query('SELECT * FROM Users WHERE user_id = @user_id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Update user
app.put('/api/users/:id', async (req, res) => {
    try {
        const { username, email, full_name, default_currency } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.id)
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(100), email)
            .input('full_name', sql.VarChar(100), full_name)
            .input('default_currency', sql.VarChar(3), default_currency)
            .query(`
                UPDATE Users 
                SET username = @username,
                    email = @email,
                    full_name = @full_name,
                    default_currency = @default_currency
                WHERE user_id = @user_id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Delete user
app.delete('/api/users/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.id)
            .query('DELETE FROM Users WHERE user_id = @user_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// CATEGORIES API - CRUD Operations
// ============================================

// CREATE - Add new category
app.post('/api/categories', async (req, res) => {
    try {
        const { user_id, category_name, category_type, description } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('category_name', sql.VarChar(50), category_name)
            .input('category_type', sql.VarChar(10), category_type)
            .input('description', sql.VarChar(255), description)
            .query(`
                INSERT INTO Categories (user_id, category_name, category_type, description)
                VALUES (@user_id, @category_name, @category_type, @description);
                SELECT SCOPE_IDENTITY() AS category_id;
            `);
        
        res.status(201).json({
            message: 'Category created successfully',
            category_id: result.recordset[0].category_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get all categories for a user
app.get('/api/categories/user/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Categories WHERE user_id = @user_id');
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get category by ID
app.get('/api/categories/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('category_id', sql.Int, req.params.id)
            .query('SELECT * FROM Categories WHERE category_id = @category_id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Update category
app.put('/api/categories/:id', async (req, res) => {
    try {
        const { category_name, category_type, description } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('category_id', sql.Int, req.params.id)
            .input('category_name', sql.VarChar(50), category_name)
            .input('category_type', sql.VarChar(10), category_type)
            .input('description', sql.VarChar(255), description)
            .query(`
                UPDATE Categories 
                SET category_name = @category_name,
                    category_type = @category_type,
                    description = @description
                WHERE category_id = @category_id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ message: 'Category updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Delete category
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('category_id', sql.Int, req.params.id)
            .query('DELETE FROM Categories WHERE category_id = @category_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Category not found' });
        }
        
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// ACCOUNTS API - CRUD Operations
// ============================================

// CREATE - Add new account
app.post('/api/accounts', async (req, res) => {
    try {
        const { user_id, account_name, account_type, current_balance, currency_code } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('account_name', sql.VarChar(100), account_name)
            .input('account_type', sql.VarChar(20), account_type)
            .input('current_balance', sql.Decimal(12, 2), current_balance || 0)
            .input('currency_code', sql.VarChar(3), currency_code || 'PKR')
            .query(`
                INSERT INTO Accounts (user_id, account_name, account_type, current_balance, currency_code)
                VALUES (@user_id, @account_name, @account_type, @current_balance, @currency_code);
                SELECT SCOPE_IDENTITY() AS account_id;
            `);
        
        res.status(201).json({
            message: 'Account created successfully',
            account_id: result.recordset[0].account_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get all accounts for a user
app.get('/api/accounts/user/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Accounts WHERE user_id = @user_id');
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get account by ID
app.get('/api/accounts/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('account_id', sql.Int, req.params.id)
            .query('SELECT * FROM Accounts WHERE account_id = @account_id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Update account
app.put('/api/accounts/:id', async (req, res) => {
    try {
        const { account_name, account_type, is_active } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('account_id', sql.Int, req.params.id)
            .input('account_name', sql.VarChar(100), account_name)
            .input('account_type', sql.VarChar(20), account_type)
            .input('is_active', sql.Bit, is_active)
            .query(`
                UPDATE Accounts 
                SET account_name = @account_name,
                    account_type = @account_type,
                    is_active = @is_active
                WHERE account_id = @account_id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        res.json({ message: 'Account updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Delete account
app.delete('/api/accounts/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('account_id', sql.Int, req.params.id)
            .query('DELETE FROM Accounts WHERE account_id = @account_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Account not found' });
        }
        
        res.json({ message: 'Account deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// TRANSACTIONS API - CRUD Operations
// ============================================

// CREATE - Add new transaction
app.post('/api/transactions', async (req, res) => {
    try {
        const { user_id, account_id, category_id, transaction_type, amount, 
                transaction_date, description, payment_method } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('account_id', sql.Int, account_id)
            .input('category_id', sql.Int, category_id)
            .input('transaction_type', sql.VarChar(10), transaction_type)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('transaction_date', sql.Date, transaction_date)
            .input('description', sql.VarChar(255), description)
            .input('payment_method', sql.VarChar(50), payment_method)
            .query(`
                INSERT INTO Transactions (user_id, account_id, category_id, transaction_type, 
                                         amount, transaction_date, description, payment_method)
                VALUES (@user_id, @account_id, @category_id, @transaction_type, 
                        @amount, @transaction_date, @description, @payment_method);
                SELECT SCOPE_IDENTITY() AS transaction_id;
            `);
        
        res.status(201).json({
            message: 'Transaction created successfully',
            transaction_id: result.recordset[0].transaction_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get all transactions for a user
app.get('/api/transactions/user/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT t.*, c.category_name, a.account_name
                FROM Transactions t
                JOIN Categories c ON t.category_id = c.category_id
                JOIN Accounts a ON t.account_id = a.account_id
                WHERE t.user_id = @user_id
                ORDER BY t.transaction_date DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get transaction by ID
app.get('/api/transactions/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('transaction_id', sql.Int, req.params.id)
            .query('SELECT * FROM Transactions WHERE transaction_id = @transaction_id');
        
        if (result.recordset.length === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Update transaction
app.put('/api/transactions/:id', async (req, res) => {
    try {
        const { category_id, transaction_type, amount, transaction_date, 
                description, payment_method } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('transaction_id', sql.Int, req.params.id)
            .input('category_id', sql.Int, category_id)
            .input('transaction_type', sql.VarChar(10), transaction_type)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('transaction_date', sql.Date, transaction_date)
            .input('description', sql.VarChar(255), description)
            .input('payment_method', sql.VarChar(50), payment_method)
            .query(`
                UPDATE Transactions 
                SET category_id = @category_id,
                    transaction_type = @transaction_type,
                    amount = @amount,
                    transaction_date = @transaction_date,
                    description = @description,
                    payment_method = @payment_method
                WHERE transaction_id = @transaction_id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json({ message: 'Transaction updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Delete transaction
app.delete('/api/transactions/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('transaction_id', sql.Int, req.params.id)
            .query('DELETE FROM Transactions WHERE transaction_id = @transaction_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Transaction not found' });
        }
        
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// BUDGETS API - CRUD Operations
// ============================================

// CREATE - Add new budget
app.post('/api/budgets', async (req, res) => {
    try {
        const { user_id, category_id, budget_amount, budget_month, alert_threshold } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('category_id', sql.Int, category_id)
            .input('budget_amount', sql.Decimal(12, 2), budget_amount)
            .input('budget_month', sql.Date, budget_month)
            .input('alert_threshold', sql.Decimal(5, 2), alert_threshold || 90.00)
            .query(`
                INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold)
                VALUES (@user_id, @category_id, @budget_amount, @budget_month, @alert_threshold);
                SELECT SCOPE_IDENTITY() AS budget_id;
            `);
        
        res.status(201).json({
            message: 'Budget created successfully',
            budget_id: result.recordset[0].budget_id
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// READ - Get all budgets for a user
app.get('/api/budgets/user/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT b.*, c.category_name
                FROM Budgets b
                JOIN Categories c ON b.category_id = c.category_id
                WHERE b.user_id = @user_id
                ORDER BY b.budget_month DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// UPDATE - Update budget
app.put('/api/budgets/:id', async (req, res) => {
    try {
        const { budget_amount, alert_threshold } = req.body;
        
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('budget_id', sql.Int, req.params.id)
            .input('budget_amount', sql.Decimal(12, 2), budget_amount)
            .input('alert_threshold', sql.Decimal(5, 2), alert_threshold)
            .query(`
                UPDATE Budgets 
                SET budget_amount = @budget_amount,
                    alert_threshold = @alert_threshold
                WHERE budget_id = @budget_id
            `);
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        
        res.json({ message: 'Budget updated successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE - Delete budget
app.delete('/api/budgets/:id', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('budget_id', sql.Int, req.params.id)
            .query('DELETE FROM Budgets WHERE budget_id = @budget_id');
        
        if (result.rowsAffected[0] === 0) {
            return res.status(404).json({ error: 'Budget not found' });
        }
        
        res.json({ message: 'Budget deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Dashboard/Analytics Endpoints
// ============================================

// Get user dashboard summary
app.get('/api/dashboard/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT * FROM User_Dashboard_Summary 
                WHERE user_id = @user_id
            `);
        
        res.json(result.recordset[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get budget status overview
app.get('/api/budget-status/:userId', async (req, res) => {
    try {
        const pool = await sql.connect(config);
        const result = await pool.request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT * FROM Budget_Status_Overview 
                WHERE user_id = @user_id
                ORDER BY percentage_used DESC
            `);
        
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ============================================
// Root Endpoint
// ============================================

app.get('/', (req, res) => {
    res.send('Personal Finance Tracker API - Running Successfully!');
});

// ============================================
// Start Server
// ============================================

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log('Available endpoints:');
    console.log('  POST   /api/users');
    console.log('  GET    /api/users');
    console.log('  GET    /api/users/:id');
    console.log('  PUT    /api/users/:id');
    console.log('  DELETE /api/users/:id');
    console.log('');
    console.log('  Similar endpoints available for:');
    console.log('    - /api/categories');
    console.log('    - /api/accounts');
    console.log('    - /api/transactions');
    console.log('    - /api/budgets');
    console.log('');
    console.log('  Analytics:');
    console.log('    - /api/dashboard/:userId');
    console.log('    - /api/budget-status/:userId');
});