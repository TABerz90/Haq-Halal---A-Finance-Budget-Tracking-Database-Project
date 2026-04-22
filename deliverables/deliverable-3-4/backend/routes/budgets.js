// routes/budgets.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create budget
router.post('/', async (req, res) => {
    try {
        const { user_id, category_id, budget_amount, budget_month, alert_threshold } = req.body;
        const result = await getPool(req).request()
            .input('user_id', sql.Int, user_id)
            .input('category_id', sql.Int, category_id)
            .input('budget_amount', sql.Decimal(12, 2), budget_amount)
            .input('budget_month', sql.Date, budget_month)
            .input('alert_threshold', sql.Decimal(5, 2), alert_threshold || 90.00)
            .query(`INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold)
                    VALUES (@user_id, @category_id, @budget_amount, @budget_month, @alert_threshold);
                    SELECT SCOPE_IDENTITY() AS budget_id;`);
        res.status(201).json({ message: 'Budget created successfully', budget_id: result.recordset[0].budget_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all budgets for a user (with category name and real-time spend)
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`
                SELECT b.*, c.category_name,
                    ISNULL(SUM(t.amount), 0) AS actual_spent,
                    b.budget_amount - ISNULL(SUM(t.amount), 0) AS remaining,
                    ROUND(ISNULL(SUM(t.amount), 0) / b.budget_amount * 100, 2) AS percentage_used
                FROM Budgets b
                JOIN Categories c ON b.category_id = c.category_id
                LEFT JOIN Transactions t ON b.category_id = t.category_id
                    AND b.user_id = t.user_id
                    AND t.transaction_type = 'Expense'
                    AND DATEFROMPARTS(YEAR(t.transaction_date), MONTH(t.transaction_date), 1) = b.budget_month
                WHERE b.user_id = @user_id
                GROUP BY b.budget_id, b.user_id, b.category_id, c.category_name,
                         b.budget_amount, b.budget_month, b.alert_threshold, b.created_at
                ORDER BY b.budget_month DESC
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update budget
router.put('/:id', async (req, res) => {
    try {
        const { budget_amount, alert_threshold } = req.body;
        const result = await getPool(req).request()
            .input('budget_id', sql.Int, req.params.id)
            .input('budget_amount', sql.Decimal(12, 2), budget_amount)
            .input('alert_threshold', sql.Decimal(5, 2), alert_threshold)
            .query(`UPDATE Budgets SET budget_amount=@budget_amount, alert_threshold=@alert_threshold WHERE budget_id=@budget_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Budget not found' });
        res.json({ message: 'Budget updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE budget
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('budget_id', sql.Int, req.params.id)
            .query('DELETE FROM Budgets WHERE budget_id = @budget_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Budget not found' });
        res.json({ message: 'Budget deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
