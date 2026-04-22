// routes/recurring.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create recurring transaction
router.post('/', async (req, res) => {
    try {
        const {
            user_id, account_id, category_id, transaction_type,
            amount, frequency, start_date, end_date,
            description, payment_method
        } = req.body;

        if (!user_id || !account_id || !category_id || !transaction_type || !amount || !frequency || !start_date) {
            return res.status(400).json({ error: 'user_id, account_id, category_id, transaction_type, amount, frequency, and start_date are required.' });
        }

        const result = await getPool(req).request()
            .input('user_id', sql.Int, user_id)
            .input('account_id', sql.Int, account_id)
            .input('category_id', sql.Int, category_id)
            .input('transaction_type', sql.VarChar(10), transaction_type)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('frequency', sql.VarChar(10), frequency)
            .input('start_date', sql.Date, start_date)
            .input('end_date', sql.Date, end_date || null)
            .input('description', sql.VarChar(255), description || null)
            .input('payment_method', sql.VarChar(50), payment_method || null)
            .query(`
                INSERT INTO Recurring_Transactions
                    (user_id, account_id, category_id, transaction_type, amount,
                     frequency, start_date, end_date, description, payment_method, is_active)
                VALUES
                    (@user_id, @account_id, @category_id, @transaction_type, @amount,
                     @frequency, @start_date, @end_date, @description, @payment_method, 1);
                SELECT SCOPE_IDENTITY() AS recurring_id;
            `);

        res.status(201).json({
            message: 'Recurring transaction created successfully.',
            recurring_id: result.recordset[0].recurring_id
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all recurring transactions for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT
                    rt.recurring_id, rt.user_id, rt.transaction_type, rt.amount,
                    rt.frequency, rt.start_date, rt.end_date, rt.description,
                    rt.payment_method, rt.is_active, rt.last_generated_date, rt.created_at,
                    c.category_name, a.account_name,
                    CASE rt.frequency
                        WHEN 'Daily'   THEN DATEADD(DAY,   1, ISNULL(rt.last_generated_date, rt.start_date))
                        WHEN 'Weekly'  THEN DATEADD(WEEK,  1, ISNULL(rt.last_generated_date, rt.start_date))
                        WHEN 'Monthly' THEN DATEADD(MONTH, 1, ISNULL(rt.last_generated_date, rt.start_date))
                        WHEN 'Yearly'  THEN DATEADD(YEAR,  1, ISNULL(rt.last_generated_date, rt.start_date))
                    END AS next_due_date
                FROM Recurring_Transactions rt
                JOIN Categories c ON rt.category_id = c.category_id
                JOIN Accounts a ON rt.account_id = a.account_id
                WHERE rt.user_id = @user_id
                ORDER BY rt.is_active DESC, next_due_date ASC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET recurring transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('recurring_id', sql.Int, req.params.id)
            .query(`
                SELECT rt.*, c.category_name, a.account_name
                FROM Recurring_Transactions rt
                JOIN Categories c ON rt.category_id = c.category_id
                JOIN Accounts a ON rt.account_id = a.account_id
                WHERE rt.recurring_id = @recurring_id
            `);
        if (!result.recordset.length) return res.status(404).json({ error: 'Recurring transaction not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update recurring transaction
router.put('/:id', async (req, res) => {
    try {
        const { amount, frequency, end_date, description, payment_method, is_active } = req.body;
        const result = await getPool(req).request()
            .input('recurring_id', sql.Int, req.params.id)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('frequency', sql.VarChar(10), frequency)
            .input('end_date', sql.Date, end_date || null)
            .input('description', sql.VarChar(255), description || null)
            .input('payment_method', sql.VarChar(50), payment_method || null)
            .input('is_active', sql.Bit, is_active)
            .query(`
                UPDATE Recurring_Transactions
                SET amount=@amount, frequency=@frequency, end_date=@end_date,
                    description=@description, payment_method=@payment_method, is_active=@is_active
                WHERE recurring_id=@recurring_id
            `);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Recurring transaction not found.' });
        res.json({ message: 'Recurring transaction updated successfully.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE recurring transaction
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('recurring_id', sql.Int, req.params.id)
            .query('DELETE FROM Recurring_Transactions WHERE recurring_id = @recurring_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Recurring transaction not found.' });
        res.json({ message: 'Recurring transaction deleted successfully.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/recurring/:id/generate
// Manually trigger generation of a recurring transaction into Transactions table
router.post('/:id/generate', async (req, res) => {
    try {
        const pool = getPool(req);

        const rtResult = await pool.request()
            .input('recurring_id', sql.Int, req.params.id)
            .query(`
                SELECT * FROM Recurring_Transactions WHERE recurring_id = @recurring_id AND is_active = 1
            `);

        if (!rtResult.recordset.length) {
            return res.status(404).json({ error: 'Active recurring transaction not found.' });
        }

        const rt = rtResult.recordset[0];
        const today = new Date().toISOString().split('T')[0];

        // Insert into Transactions
        const insertResult = await pool.request()
            .input('user_id', sql.Int, rt.user_id)
            .input('account_id', sql.Int, rt.account_id)
            .input('category_id', sql.Int, rt.category_id)
            .input('transaction_type', sql.VarChar(10), rt.transaction_type)
            .input('amount', sql.Decimal(12, 2), rt.amount)
            .input('transaction_date', sql.Date, today)
            .input('description', sql.VarChar(255), rt.description || 'Recurring transaction')
            .input('payment_method', sql.VarChar(50), rt.payment_method || null)
            .query(`
                INSERT INTO Transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method)
                VALUES (@user_id, @account_id, @category_id, @transaction_type, @amount, @transaction_date, @description, @payment_method);
                SELECT SCOPE_IDENTITY() AS transaction_id;
            `);

        // Update last_generated_date
        await pool.request()
            .input('recurring_id', sql.Int, rt.recurring_id)
            .input('today', sql.Date, today)
            .query(`UPDATE Recurring_Transactions SET last_generated_date = @today WHERE recurring_id = @recurring_id`);

        res.status(201).json({
            message: 'Transaction generated successfully.',
            transaction_id: insertResult.recordset[0].transaction_id
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
