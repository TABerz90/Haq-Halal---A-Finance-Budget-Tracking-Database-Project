// routes/dashboard.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// GET /api/dashboard/:userId — full dashboard summary
router.get('/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM User_Dashboard_Summary WHERE user_id = @user_id');
        res.json(result.recordset[0] || {});
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/:userId/budget-status
router.get('/:userId/budget-status', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`SELECT * FROM Budget_Status_Overview WHERE user_id = @user_id ORDER BY percentage_used DESC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/:userId/monthly-trend — last 6 months
router.get('/:userId/monthly-trend', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT
                    FORMAT(transaction_date, 'yyyy-MM') AS month,
                    SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE 0 END) AS total_income,
                    SUM(CASE WHEN transaction_type = 'Expense' THEN amount ELSE 0 END) AS total_expenses,
                    SUM(CASE WHEN transaction_type = 'Income' THEN amount ELSE -amount END) AS net_savings
                FROM Transactions
                WHERE user_id = @user_id
                    AND transaction_date >= DATEADD(MONTH, -6, GETDATE())
                GROUP BY FORMAT(transaction_date, 'yyyy-MM')
                ORDER BY month ASC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/:userId/top-categories — top 5 spending this month
router.get('/:userId/top-categories', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT TOP 5
                    c.category_name,
                    SUM(t.amount) AS total_spent,
                    COUNT(t.transaction_id) AS transaction_count
                FROM Transactions t
                JOIN Categories c ON t.category_id = c.category_id
                WHERE t.user_id = @user_id
                    AND t.transaction_type = 'Expense'
                    AND MONTH(t.transaction_date) = MONTH(GETDATE())
                    AND YEAR(t.transaction_date) = YEAR(GETDATE())
                GROUP BY c.category_name
                ORDER BY total_spent DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/dashboard/:userId/alerts — unread budget alerts
router.get('/:userId/alerts', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Unread_Budget_Alerts WHERE user_id = @user_id ORDER BY created_at DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/dashboard/alerts/:alertId/read — mark alert as read
router.put('/alerts/:alertId/read', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('alert_id', sql.Int, req.params.alertId)
            .query('UPDATE Budget_Alerts SET is_read = 1 WHERE alert_id = @alert_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Alert not found' });
        res.json({ message: 'Alert marked as read' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
