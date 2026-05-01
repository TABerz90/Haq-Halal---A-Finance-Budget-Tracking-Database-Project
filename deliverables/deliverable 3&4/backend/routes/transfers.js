const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create account transfer via sp_createTransfer
// Validation (same account, balance check) handled inside the procedure.
// trg_update_balance_after_transfer fires on insert to update balances.
router.post('/', async (req, res) => {
    try {
        const { user_id, from_account_id, to_account_id, amount, transfer_date, description } = req.body;

        if (!user_id || !from_account_id || !to_account_id || !amount || !transfer_date) {
            return res.status(400).json({ error: 'user_id, from_account_id, to_account_id, amount, and transfer_date are required.' });
        }

        const result = await getPool(req).request()
            .input('user_id',         sql.Int,           user_id)
            .input('from_account_id', sql.Int,           from_account_id)
            .input('to_account_id',   sql.Int,           to_account_id)
            .input('amount',          sql.Decimal(12,2), amount)
            .input('transfer_date',   sql.Date,          transfer_date)
            .input('description',     sql.VarChar(255),  description || null)
            .execute('sp_createTransfer');

        res.status(201).json({ message: 'Transfer completed successfully.', transfer_id: result.recordset[0].transfer_id });
    } catch (err) {
        const msg = err.message;
        if (msg.includes('must be different'))       return res.status(400).json({ error: msg });
        if (msg.includes('not found or inactive'))   return res.status(404).json({ error: msg });
        if (msg.includes('Insufficient balance'))    return res.status(400).json({ error: msg });
        res.status(500).json({ error: msg });
    }
});

// GET all transfers for a user via vw_transferDetail
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM vw_transferDetail WHERE user_id = @user_id ORDER BY transfer_date DESC, transfer_id DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transfer by ID via vw_transferDetail
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transfer_id', sql.Int, req.params.id)
            .query('SELECT * FROM vw_transferDetail WHERE transfer_id = @transfer_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'Transfer not found.' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE transfer — trg_reverse_balance_on_transfer_delete reverses both account balances
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transfer_id', sql.Int, req.params.id)
            .query('DELETE FROM Account_Transfers WHERE transfer_id = @transfer_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Transfer not found.' });
        res.json({ message: 'Transfer deleted and account balances reversed.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
