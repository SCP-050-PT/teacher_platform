const express = require('express');
const router = express.Router();
const pool = require('../config/database');

router.post('/', async (req, res) => {
    try {
        const { teacher_id, fio, position, organization, category, experience, period, subject, data } = req.body;
        const result = await pool.query(
            `INSERT INTO ipr_plans (teacher_id, fio, position, organization, category, experience, period, subject, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [teacher_id || null, fio, position, organization, category, experience, period, subject, JSON.stringify(data || {})]
        );
        res.json({ success: true, id: result.rows[0].id });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ipr_plans ORDER BY created_at DESC LIMIT 100');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM ipr_plans WHERE id=$1', [req.params.id]);
        if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { fio, position, organization, category, experience, period, subject, data } = req.body;
        await pool.query(
            `UPDATE ipr_plans SET fio=$1, position=$2, organization=$3, category=$4, experience=$5, period=$6, subject=$7, data=$8 WHERE id=$9`,
            [fio, position, organization, category, experience, period, subject, JSON.stringify(data || {}), req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM ipr_plans WHERE id=$1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;