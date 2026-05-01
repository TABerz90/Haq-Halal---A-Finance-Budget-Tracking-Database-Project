const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create budget
router.post('/', async (req, res) => {
    try {
        const { user_id, category_id, budget_amount, budget_month, alert_threshold } = req.body;
        const result = await getPool(req).request()
            .input('user_id',         sql.Int,           user_id)
            .input('category_id',     sql.Int,           category_id)
            .input('budget_amount',   sql.Decimal(12,2), budget_amount)
            .input('budget_month',    sql.Date,          budget_month)
            .input('alert_threshold', sql.Decimal(5,2),  alert_threshold || 90.00)
            .query(`INSERT INTO Budgets (user_id, category_id, budget_amount, budget_month, alert_threshold)
                    VALUES (@user_id, @category_id, @budget_amount, @budget_month, @alert_threshold);
                    SELECT SCOPE_IDENTITY() AS budget_id;`);
        res.status(201).json({ message: 'Budget created successfully', budget_id: result.recordset[0].budget_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET current month's budgets for a user via vw_budgetStatus
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query(`SELECT * FROM vw_budgetStatus
                    WHERE user_id    = @user_id
                      AND budget_month = DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)
                    ORDER BY category_name ASC`);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update budget
router.put('/:id', async (req, res) => {
    try {
        const { budget_amount, alert_threshold } = req.body;
        const result = await getPool(req).request()
            .input('budget_id',       sql.Int,          req.params.id)
            .input('budget_amount',   sql.Decimal(12,2), budget_amount)
            .input('alert_threshold', sql.Decimal(5,2),  alert_threshold)
            .query('UPDATE Budgets SET budget_amount=@budget_amount, alert_threshold=@alert_threshold WHERE budget_id=@budget_id');
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

// POST roll over last month's budgets into the current month.
// Idempotent — skips categories that already have a budget this month.
// Overspend from last month is carried forward as carryover_amount.
router.post('/rollover/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .execute('sp_rolloverBudgets');
        res.json({ budgets_created: result.recordset[0].budgets_created });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
