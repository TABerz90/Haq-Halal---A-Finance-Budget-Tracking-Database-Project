// routes/users.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// GET all users
router.get('/', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .query('SELECT user_id, username, email, full_name, default_currency, created_at, last_login FROM Users');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET user by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.id)
            .query('SELECT user_id, username, email, full_name, default_currency, created_at, last_login FROM Users WHERE user_id = @user_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'User not found' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update user
router.put('/:id', async (req, res) => {
    try {
        const { username, email, full_name, default_currency } = req.body;
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.id)
            .input('username', sql.VarChar(50), username)
            .input('email', sql.VarChar(100), email)
            .input('full_name', sql.VarChar(100), full_name)
            .input('default_currency', sql.VarChar(3), default_currency)
            .query(`UPDATE Users SET username=@username, email=@email, full_name=@full_name, default_currency=@default_currency WHERE user_id=@user_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE user
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.id)
            .query('DELETE FROM Users WHERE user_id = @user_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'User not found' });
        res.json({ message: 'User deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
