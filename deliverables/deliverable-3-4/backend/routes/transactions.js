// routes/transactions.js
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
            .input('user_id', sql.Int, user_id)
            .input('account_id', sql.Int, account_id)
            .input('category_id', sql.Int, category_id || null)
            .input('transaction_type', sql.VarChar(10), transaction_type)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('transaction_date', sql.Date, transaction_date)
            .input('description', sql.VarChar(255), description)
            .input('payment_method', sql.VarChar(50), payment_method)
            .query(`INSERT INTO Transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, description, payment_method)
                    VALUES (@user_id, @account_id, @category_id, @transaction_type, @amount, @transaction_date, @description, @payment_method);
                    SELECT SCOPE_IDENTITY() AS transaction_id;`);
        res.status(201).json({ message: 'Transaction created successfully', transaction_id: result.recordset[0].transaction_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET transactions for a user — supports search, filter, pagination
// Query params: page, limit, type, category_id, account_id, search, date_from, date_to, amount_min, amount_max
router.get('/user/:userId', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const {
            page = 1,
            limit = 20,
            type,
            category_id,
            account_id,
            search,
            date_from,
            date_to,
            amount_min,
            amount_max
        } = req.query;

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const request = getPool(req).request()
            .input('user_id', sql.Int, userId)
            .input('offset', sql.Int, offset)
            .input('limit', sql.Int, parseInt(limit));

        let filters = 'WHERE t.user_id = @user_id';

        if (type) {
            request.input('type', sql.VarChar(10), type);
            filters += ' AND t.transaction_type = @type';
        }
        if (category_id) {
            request.input('category_id', sql.Int, parseInt(category_id));
            filters += ' AND t.category_id = @category_id';
        }
        if (account_id) {
            request.input('account_id', sql.Int, parseInt(account_id));
            filters += ' AND t.account_id = @account_id';
        }
        if (search) {
            request.input('search', sql.VarChar(255), `%${search}%`);
            filters += ' AND (t.description LIKE @search OR c.category_name LIKE @search)';
        }
        if (date_from) {
            request.input('date_from', sql.Date, date_from);
            filters += ' AND t.transaction_date >= @date_from';
        }
        if (date_to) {
            request.input('date_to', sql.Date, date_to);
            filters += ' AND t.transaction_date <= @date_to';
        }
        if (amount_min) {
            request.input('amount_min', sql.Decimal(12, 2), parseFloat(amount_min));
            filters += ' AND t.amount >= @amount_min';
        }
        if (amount_max) {
            request.input('amount_max', sql.Decimal(12, 2), parseFloat(amount_max));
            filters += ' AND t.amount <= @amount_max';
        }

        const query = `
            SELECT 
                t.transaction_id, t.user_id, t.account_id, t.category_id,
                t.transaction_type, t.amount, t.transaction_date,
                t.description, t.payment_method, t.created_at,
                c.category_name, a.account_name
            FROM Transactions t
            LEFT JOIN Categories c ON t.category_id = c.category_id
            JOIN Accounts a ON t.account_id = a.account_id
            ${filters}
            ORDER BY t.transaction_date DESC, t.transaction_id DESC
            OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY;

            SELECT COUNT(*) AS total
            FROM Transactions t
            LEFT JOIN Categories c ON t.category_id = c.category_id
            ${filters};
        `;

        const result = await request.query(query);
        const transactions = result.recordsets[0];
        const total = result.recordsets[1][0].total;

        res.json({
            data: transactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
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
            .query(`SELECT t.*, c.category_name, a.account_name
                    FROM Transactions t
                    LEFT JOIN Categories c ON t.category_id = c.category_id
                    JOIN Accounts a ON t.account_id = a.account_id
                    WHERE t.transaction_id = @transaction_id`);
        if (!result.recordset.length) return res.status(404).json({ error: 'Transaction not found' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update transaction
router.put('/:id', async (req, res) => {
    try {
        const { category_id, transaction_type, amount, transaction_date, description, payment_method } = req.body;
        const result = await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.id)
            .input('category_id', sql.Int, category_id || null)
            .input('transaction_type', sql.VarChar(10), transaction_type)
            .input('amount', sql.Decimal(12, 2), amount)
            .input('transaction_date', sql.Date, transaction_date)
            .input('description', sql.VarChar(255), description)
            .input('payment_method', sql.VarChar(50), payment_method)
            .query(`UPDATE Transactions SET category_id=@category_id, transaction_type=@transaction_type,
                    amount=@amount, transaction_date=@transaction_date, description=@description,
                    payment_method=@payment_method WHERE transaction_id=@transaction_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Transaction not found' });
        res.json({ message: 'Transaction updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE transaction
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
