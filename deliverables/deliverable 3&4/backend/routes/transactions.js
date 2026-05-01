const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create transaction
router.post('/', async (req, res) => {
    try {
        const { user_id, account_id, category_id, transaction_type, amount,
                transaction_date, description, payment_method } = req.body;
        const result = await getPool(req).request()
            .input('user_id',           sql.Int,          user_id)
            .input('account_id',        sql.Int,          account_id)
            .input('category_id',       sql.Int,          category_id || null)
            .input('transaction_type',  sql.VarChar(10),  transaction_type)
            .input('amount',            sql.Decimal(12,2), amount)
            .input('transaction_date',  sql.Date,         transaction_date)
            .input('description',       sql.VarChar(255), description)
            .input('payment_method',    sql.VarChar(50),  payment_method)
            .query(`INSERT INTO Transactions
                        (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method)
                    VALUES
                        (@user_id, @account_id, @category_id, @transaction_type, @amount, @transaction_date, @description, @payment_method);
                    SELECT SCOPE_IDENTITY() AS transaction_id;`);
        res.status(201).json({ message: 'Transaction created successfully', transaction_id: result.recordset[0].transaction_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transactions for a user — paginated + filtered via sp_getTransactions
// Query params: page, limit, type, category_id, account_id, search, date_from, date_to, amount_min, amount_max
router.get('/user/:userId', async (req, res) => {
    try {
        const {
            page = 1, limit = 20,
            type, category_id, account_id, search,
            date_from, date_to, amount_min, amount_max
        } = req.query;

        const result = await getPool(req).request()
            .input('user_id',     sql.Int,           parseInt(req.params.userId))
            .input('page',        sql.Int,           parseInt(page))
            .input('limit',       sql.Int,           parseInt(limit))
            .input('type',        sql.VarChar(10),   type        || null)
            .input('category_id', sql.Int,           category_id ? parseInt(category_id) : null)
            .input('account_id',  sql.Int,           account_id  ? parseInt(account_id)  : null)
            .input('search',      sql.VarChar(255),  search      || null)
            .input('date_from',   sql.Date,          date_from   || null)
            .input('date_to',     sql.Date,          date_to     || null)
            .input('amount_min',  sql.Decimal(12,2), amount_min  ? parseFloat(amount_min) : null)
            .input('amount_max',  sql.Decimal(12,2), amount_max  ? parseFloat(amount_max) : null)
            .execute('sp_getTransactions');

        const transactions = result.recordsets[0];
        const total        = result.recordsets[1][0].total;

        res.json({
            data: transactions,
            pagination: {
                page:       parseInt(page),
                limit:      parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transaction by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.id)
            .query('SELECT * FROM vw_transactionDetail WHERE transaction_id = @transaction_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'Transaction not found' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update transaction
router.put('/:id', async (req, res) => {
    try {
        const { category_id, transaction_type, amount, transaction_date, description, payment_method } = req.body;
        const result = await getPool(req).request()
            .input('transaction_id',  sql.Int,          req.params.id)
            .input('category_id',     sql.Int,          category_id || null)
            .input('transaction_type',sql.VarChar(10),  transaction_type)
            .input('amount',          sql.Decimal(12,2), amount)
            .input('transaction_date',sql.Date,         transaction_date)
            .input('description',     sql.VarChar(255), description)
            .input('payment_method',  sql.VarChar(50),  payment_method)
            .query(`UPDATE Transactions
                    SET category_id=@category_id, transaction_type=@transaction_type,
                        amount=@amount, transaction_date=@transaction_date,
                        description=@description, payment_method=@payment_method
                    WHERE transaction_id=@transaction_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Transaction not found' });
        res.json({ message: 'Transaction updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE transaction — trg_reverse_balance_on_transaction_delete handles balance rollback
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.id)
            .query('DELETE FROM Transactions WHERE transaction_id = @transaction_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Transaction not found' });
        res.json({ message: 'Transaction deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
