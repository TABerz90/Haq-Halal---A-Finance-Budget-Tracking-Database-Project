// routes/categories.js
const express = require('express');
const router = express.Router();
const sql = require('mssql');

function getPool(req) { return req.app.get('dbPool'); }

// POST create category
router.post('/', async (req, res) => {
    try {
        const { user_id, category_name, category_type, description } = req.body;
        const result = await getPool(req).request()
            .input('user_id', sql.Int, user_id)
            .input('category_name', sql.VarChar(50), category_name)
            .input('category_type', sql.VarChar(10), category_type)
            .input('description', sql.VarChar(255), description)
            .query(`INSERT INTO Categories (user_id, category_name, category_type, description)
                    VALUES (@user_id, @category_name, @category_type, @description);
                    SELECT SCOPE_IDENTITY() AS category_id;`);
        res.status(201).json({ message: 'Category created successfully', category_id: result.recordset[0].category_id });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all categories for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('user_id', sql.Int, req.params.userId)
            .query('SELECT * FROM Categories WHERE user_id = @user_id ORDER BY category_type, category_name');
        res.json(result.recordset);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET category by ID
router.get('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('category_id', sql.Int, req.params.id)
            .query('SELECT * FROM Categories WHERE category_id = @category_id');
        if (!result.recordset.length) return res.status(404).json({ error: 'Category not found' });
        res.json(result.recordset[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update category
router.put('/:id', async (req, res) => {
    try {
        const { category_name, category_type, description } = req.body;
        const result = await getPool(req).request()
            .input('category_id', sql.Int, req.params.id)
            .input('category_name', sql.VarChar(50), category_name)
            .input('category_type', sql.VarChar(10), category_type)
            .input('description', sql.VarChar(255), description)
            .query(`UPDATE Categories SET category_name=@category_name, category_type=@category_type, description=@description WHERE category_id=@category_id`);
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category updated successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE category
router.delete('/:id', async (req, res) => {
    try {
        const result = await getPool(req).request()
            .input('category_id', sql.Int, req.params.id)
            .query('DELETE FROM Categories WHERE category_id = @category_id');
        if (!result.rowsAffected[0]) return res.status(404).json({ error: 'Category not found' });
        res.json({ message: 'Category deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
