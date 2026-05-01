// routes/tags.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create tag
router.post('/', async (req, res) => {
    try {
        const { user_id, tag_name } = req.body;
        if (!user_id || !tag_name) return res.status(400).json({ error: 'user_id and tag_name are required.' });

        const result = await getPool(req).request()
            .input('user_id', sql.Int, user_id)
            .input('tag_name', sql.VarChar(50), tag_name)
            .query(`
                INSERT INTO Tags (user_id, tag_name)
                VALUES (@user_id, @tag_name);
                SELECT SCOPE_IDENTITY() AS tag_id;
            `);
        res.status(201).json({ message: 'Tag created successfully.', tag_id: result.recordset[0].tag_id });
    } catch (err) {
        if (err.message.includes('UQ_User_Tag')) return res.status(409).json({ error: 'Tag already exists for this user.' });
        res.status(500).json({ error: err.message });
    }
});

// GET all tags for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Tags WHERE user_id = @user_id ORDER BY tag_name');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE tag
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('tag_id', sql.Int, req.params.id)
            .query('DELETE FROM Tags WHERE tag_id = @tag_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Tag not found.' });
        res.json({ message: 'Tag deleted successfully.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add tag to a transaction
router.post('/transaction/:transactionId/tag/:tagId', async (req, res) => {
    try {
        await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.transactionId)
            .input('tag_id', sql.Int, req.params.tagId)
            .query(`
                IF NOT EXISTS (SELECT 1 FROM Transaction_Tags WHERE transaction_id=@transaction_id AND tag_id=@tag_id)
                    INSERT INTO Transaction_Tags (transaction_id, tag_id) VALUES (@transaction_id, @tag_id);
            `);
        res.status(201).json({ message: 'Tag added to transaction.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE remove tag from a transaction
router.delete('/transaction/:transactionId/tag/:tagId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.transactionId)
            .input('tag_id', sql.Int, req.params.tagId)
            .query('DELETE FROM Transaction_Tags WHERE transaction_id=@transaction_id AND tag_id=@tag_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Tag-transaction link not found.' });
        res.json({ message: 'Tag removed from transaction.' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all tags for a specific transaction
router.get('/transaction/:transactionId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('transaction_id', sql.Int, req.params.transactionId)
            .query(`
                SELECT t.tag_id, t.tag_name
                FROM Transaction_Tags tt
                JOIN Tags t ON tt.tag_id = t.tag_id
                WHERE tt.transaction_id = @transaction_id
                ORDER BY t.tag_name
            `);
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
