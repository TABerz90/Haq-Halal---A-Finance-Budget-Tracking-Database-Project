// routes/alerts.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// GET all alerts for a user (read + unread)
router.get('/user/:userId', async (req, res) => {
    try {
        const { unread_only } = req.query;
        const pool = getPool(req);
        const request = pool.request().input('user_id', sql.Int, req.params.userId);

        let filter = 'WHERE ba.user_id = @user_id';
        if (unread_only === 'true') filter += ' AND ba.is_read = 0';

        const result = await request.query(`
            SELECT
                ba.alert_id, ba.user_id, ba.alert_type, ba.alert_message,
                ba.percentage_used, ba.is_read, ba.created_at,
                c.category_name, b.budget_amount, b.budget_month,
                DATEDIFF(DAY, ba.created_at, GETDATE()) AS days_old
            FROM Budget_Alerts ba
            JOIN Budgets b ON ba.budget_id = b.budget_id
            JOIN Categories c ON b.category_id = c.category_id
            ${filter}
            ORDER BY ba.is_read ASC, ba.created_at DESC
        `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark alert as read
router.put('/:id/read', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('alert_id', sql.Int, req.params.id)
            .query('UPDATE Budget_Alerts SET is_read = 1 WHERE alert_id = @alert_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Alert not found.' });
        res.json({ message: 'Alert marked as read.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark ALL alerts as read for a user
router.put('/user/:userId/read-all', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('UPDATE Budget_Alerts SET is_read = 1 WHERE user_id = @user_id AND is_read = 0');
        res.json({ message: `${result.rowsAffected[0]} alert(s) marked as read.` });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create a budget alert manually (used by backend logic when budget threshold exceeded)
router.post('/', async (req, res) => {
    try {
        const { budget_id, user_id, alert_type, alert_message, percentage_used } = req.body;
        if (!budget_id || !user_id || !alert_type || !alert_message || percentage_used === undefined) {
            return res.status(400).json({ error: 'budget_id, user_id, alert_type, alert_message, and percentage_used are required.' });
        }
        const result = await getPool(req).request()
            .input('budget_id', sql.Int, budget_id)
            .input('user_id', sql.Int, user_id)
            .input('alert_type', sql.VarChar(20), alert_type)
            .input('alert_message', sql.VarChar(255), alert_message)
            .input('percentage_used', sql.Decimal(5, 2), percentage_used)
            .query(`
                INSERT INTO Budget_Alerts (budget_id, user_id, alert_type, alert_message, percentage_used, is_read)
                VALUES (@budget_id, @user_id, @alert_type, @alert_message, @percentage_used, 0);
                SELECT SCOPE_IDENTITY() AS alert_id;
            `);
        res.status(201).json({ message: 'Alert created.', alert_id: result.recordset[0].alert_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE alert
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('alert_id', sql.Int, req.params.id)
            .query('DELETE FROM Budget_Alerts WHERE alert_id = @alert_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Alert not found.' });
        res.json({ message: 'Alert deleted.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
