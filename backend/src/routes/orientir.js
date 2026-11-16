const express = require('express');
const router = express.Router();
const pool = require('../config/database');
router.post('/', async (req, res) => {
  try {
    const { teacher_id, predmet, class_name, fio, visit_date, goal, score, max_score, percentage, data, recommendations } = req.body;
    const result = await pool.query(
      `INSERT INTO orientir_uroka 
       (teacher_id, predmet, class_name, fio, visit_date, goal, score, max_score, percentage, data, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [teacher_id || null, predmet, class_name, fio, visit_date || null, goal, score, max_score, percentage, JSON.stringify(data || {}), recommendations]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orientir_uroka ORDER BY created_at DESC LIMIT 100');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM orientir_uroka WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { predmet, class_name, fio, visit_date, goal, score, max_score, percentage, data, recommendations } = req.body;
    await pool.query(
      `UPDATE orientir_uroka SET 
       predmet=$1, class_name=$2, fio=$3, visit_date=$4, goal=$5, 
       score=$6, max_score=$7, percentage=$8, data=$9, recommendations=$10
       WHERE id=$11`,
      [predmet, class_name, fio, visit_date || null, goal, score, max_score, percentage, JSON.stringify(data || {}), recommendations, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orientir_uroka WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
