// routes/accounts.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create account
router.post('/', async (req, res) => {
    try {
        const { user_id, account_name, account_type, current_balance, currency_code } = req.body;
        const result = await getPool(req).request()
            .input('user_id', sql.Int, user_id)
            .input('account_name', sql.VarChar(100), account_name)
            .input('account_type', sql.VarChar(20), account_type)
            .input('current_balance', sql.Decimal(12, 2), current_balance || 0)
            .input('currency_code', sql.VarChar(3), currency_code || 'PKR')
            .query(`INSERT INTO Accounts (user_id, account_name, account_type, current_balance, currency_code)
                    VALUES (@user_id, @account_name, @account_type, @current_balance, @currency_code);
                    SELECT SCOPE_IDENTITY() AS account_id;`);
        res.status(201).json({ message: 'Account created successfully', account_id: result.recordset[0].account_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all accounts for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Accounts WHERE user_id = @user_id AND is_active = 1 ORDER BY account_name');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET account by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('account_id', sql.Int, req.params.id)
            .query('SELECT * FROM Accounts WHERE account_id = @account_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'Account not found' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update account
router.put('/:id', async (req, res) => {
    try {
        const { account_name, account_type, is_active } = req.body;
        const result = await getPool(req).request()
            .input('account_id', sql.Int, req.params.id)
            .input('account_name', sql.VarChar(100), account_name)
            .input('account_type', sql.VarChar(20), account_type)
            .input('is_active', sql.Bit, is_active)
            .query(`UPDATE Accounts SET account_name=@account_name, account_type=@account_type, is_active=@is_active WHERE account_id=@account_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Account not found' });
        res.json({ message: 'Account updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE account (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('account_id', sql.Int, req.params.id)
            .query('UPDATE Accounts SET is_active = 0 WHERE account_id = @account_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Account not found' });
        res.json({ message: 'Account deactivated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
