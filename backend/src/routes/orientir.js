const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { fioKeysMatch } = require('../utils/fio');

async function resolveTeacherId(teacher_id, fio) {
  if (teacher_id) return parseInt(teacher_id, 10) || null;
  if (!fio || !String(fio).trim()) return null;
  try {
    const exact = await pool.query(
      `SELECT id FROM teachers WHERE LOWER(TRIM(full_name)) = LOWER(TRIM($1)) LIMIT 1`,
      [fio]
    );
    if (exact.rows[0]) return exact.rows[0].id;
    const all = await pool.query(`SELECT id, full_name FROM teachers`);
    const matches = all.rows.filter((t) => fioKeysMatch(fio, t.full_name));
    if (matches.length === 1) return matches[0].id;
    return null;
  } catch (e) {
    console.error('resolveTeacherId:', e.message);
    return null;
  }
}

router.post('/', async (req, res) => {
  try {
    const {
      teacher_id, predmet, class_name, fio, visit_date, goal,
      score, max_score, percentage, data, recommendations
    } = req.body;
    const tid = await resolveTeacherId(teacher_id, fio);
    const result = await pool.query(
      `INSERT INTO orientir_uroka
       (teacher_id, predmet, class_name, fio, visit_date, goal, score, max_score, percentage, data, recommendations)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id`,
      [tid, predmet, class_name, fio, visit_date || null, goal, score, max_score, percentage, JSON.stringify(data || {}), recommendations]
    );
    res.json({ success: true, id: result.rows[0].id, teacher_id: tid });
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

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM orientir_uroka WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const {
      teacher_id, predmet, class_name, fio, visit_date, goal,
      score, max_score, percentage, data, recommendations
    } = req.body;
    const tid = await resolveTeacherId(teacher_id, fio);
    await pool.query(
      `UPDATE orientir_uroka SET
         teacher_id=$1, predmet=$2, class_name=$3, fio=$4, visit_date=$5, goal=$6,
         score=$7, max_score=$8, percentage=$9, data=$10, recommendations=$11
       WHERE id=$12`,
      [tid, predmet, class_name, fio, visit_date || null, goal, score, max_score, percentage, JSON.stringify(data || {}), recommendations, req.params.id]
    );
    res.json({ success: true, teacher_id: tid });
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

module.exports = router;
