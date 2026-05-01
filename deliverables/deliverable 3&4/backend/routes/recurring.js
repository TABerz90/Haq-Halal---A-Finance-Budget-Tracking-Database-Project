const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create recurring transaction template
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
            .input('user_id',          sql.Int,          user_id)
            .input('account_id',       sql.Int,          account_id)
            .input('category_id',      sql.Int,          category_id)
            .input('transaction_type', sql.VarChar(10),  transaction_type)
            .input('amount',           sql.Decimal(12,2), amount)
            .input('frequency',        sql.VarChar(10),  frequency)
            .input('start_date',       sql.Date,         start_date)
            .input('end_date',         sql.Date,         end_date       || null)
            .input('description',      sql.VarChar(255), description    || null)
            .input('payment_method',   sql.VarChar(50),  payment_method || null)
            .query(`INSERT INTO Recurring_Transactions
                        (user_id, account_id, category_id, transaction_type, amount,
                         frequency, start_date, end_date, description, payment_method, is_active)
                    VALUES
                        (@user_id, @account_id, @category_id, @transaction_type, @amount,
                         @frequency, @start_date, @end_date, @description, @payment_method, 1);
                    SELECT SCOPE_IDENTITY() AS recurring_id;`);

        res.status(201).json({ message: 'Recurring transaction created successfully.', recurring_id: result.recordset[0].recurring_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all recurring transactions for a user via vw_recurringDetail
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM vw_recurringDetail WHERE user_id = @user_id ORDER BY is_active DESC, next_due_date ASC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET recurring transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('recurring_id', sql.Int, req.params.id)
            .query('SELECT * FROM vw_recurringDetail WHERE recurring_id = @recurring_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'Recurring transaction not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update recurring transaction
router.put('/:id', async (req, res) => {
    try {
        const { amount, frequency, end_date, description, payment_method, is_active } = req.body;
        const result = await getPool(req).request()
            .input('recurring_id',   sql.Int,          req.params.id)
            .input('amount',         sql.Decimal(12,2), amount)
            .input('frequency',      sql.VarChar(10),  frequency)
            .input('end_date',       sql.Date,         end_date       || null)
            .input('description',    sql.VarChar(255), description    || null)
            .input('payment_method', sql.VarChar(50),  payment_method || null)
            .input('is_active',      sql.Bit,          is_active)
            .query(`UPDATE Recurring_Transactions
                    SET amount=@amount, frequency=@frequency, end_date=@end_date,
                        description=@description, payment_method=@payment_method, is_active=@is_active
                    WHERE recurring_id=@recurring_id`);
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

// POST /:id/generate — create a real transaction from a recurring template via sp_generateRecurring
// The INSERT trigger handles balance update and budget alert checks automatically
router.post('/:id/generate', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('recurring_id', sql.Int, req.params.id)
            .execute('sp_generateRecurring');

        res.status(201).json({
            message: 'Transaction generated successfully.',
            transaction_id: result.recordset[0].transaction_id
        });
    } catch (err) {
        if (err.message.includes('not found')) return res.status(404).json({ error: err.message });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
