// routes/transfers.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create account transfer
// This inserts into Account_Transfers; the DB trigger handles balance updates automatically
router.post('/', async (req, res) => {
    try {
        const { user_id, from_account_id, to_account_id, amount, transfer_date, description } = req.body;

        if (!user_id || !from_account_id || !to_account_id || !amount || !transfer_date) {
            return res.status(400).json({ error: 'user_id, from_account_id, to_account_id, amount, and transfer_date are required.' });
        }

        if (from_account_id === to_account_id) {
            return res.status(400).json({ error: 'Source and destination accounts must be different.' });
        }

        const pool = getPool(req);

        // Check source account has sufficient balance
        const balanceCheck = await pool.request()
            .input('account_id', sql.Int, from_account_id)
            .input('user_id', sql.Int, user_id)
            .query('SELECT current_balance FROM Accounts WHERE account_id = @account_id AND user_id = @user_id AND is_active = 1');

        if (!balanceCheck.recordset.length) {
            return res.status(404).json({ error: 'Source account not found or inactive.' });
        }

        if (parseFloat(balanceCheck.recordset[0].current_balance) < parseFloat(amount)) {
            return res.status(400).json({ error: 'Insufficient balance in source account.' });
        }

        // Insert transfer — trigger handles balance update
        const result = await pool.request()
            .input('user_id', sql.Int, user_id)
            .input('from_account_id', sql.Int, from_account_id)
            .input('to_account_id', sql.Int, to_account_id)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('transfer_date', sql.Date, transfer_date)
            .input('description', sql.VarChar(255), description || null)
            .query(`
                INSERT INTO Account_Transfers (user_id, from_account_id, to_account_id, amount, transfer_date, description)
                VALUES (@user_id, @from_account_id, @to_account_id, @amount, @transfer_date, @description);
                SELECT SCOPE_IDENTITY() AS transfer_id;
            `);

        res.status(201).json({
            message: 'Transfer completed successfully.',
            transfer_id: result.recordset[0].transfer_id
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all transfers for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT
                    at.transfer_id, at.user_id, at.amount, at.transfer_date,
                    at.description, at.created_at,
                    fa.account_name AS from_account, fa.account_type AS from_account_type,
                    ta.account_name AS to_account,   ta.account_type AS to_account_type
                FROM Account_Transfers at
                JOIN Accounts fa ON at.from_account_id = fa.account_id
                JOIN Accounts ta ON at.to_account_id   = ta.account_id
                WHERE at.user_id = @user_id
                ORDER BY at.transfer_date DESC, at.transfer_id DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transfer by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transfer_id', sql.Int, req.params.id)
            .query(`
                SELECT
                    at.*, 
                    fa.account_name AS from_account, fa.account_type AS from_account_type,
                    ta.account_name AS to_account,   ta.account_type AS to_account_type
                FROM Account_Transfers at
                JOIN Accounts fa ON at.from_account_id = fa.account_id
                JOIN Accounts ta ON at.to_account_id   = ta.account_id
                WHERE at.transfer_id = @transfer_id
            `);
        if (!result.recordset.length) return res.status(404).json({ error: 'Transfer not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE transfer — note: does NOT reverse account balances (balances are ground truth from triggers)
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transfer_id', sql.Int, req.params.id)
            .query('DELETE FROM Account_Transfers WHERE transfer_id = @transfer_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Transfer not found.' });
        res.json({ message: 'Transfer record deleted. Note: account balances reflect the original transfer and were not reversed.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
