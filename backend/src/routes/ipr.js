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
    const { teacher_id, fio, position, organization, category, experience, period, subject, data } = req.body;
    const tid = await resolveTeacherId(teacher_id, fio);
    const result = await pool.query(
      `INSERT INTO ipr_plans
       (teacher_id, fio, position, organization, category, experience, period, subject, data)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
      [tid, fio, position, organization, category, experience, period, subject, JSON.stringify(data || {})]
    );
    res.json({ success: true, id: result.rows[0].id, teacher_id: tid });
  } catch (err) {
    console.error(err);
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
    const result = await pool.query('SELECT * FROM ipr_plans WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { teacher_id, fio, position, organization, category, experience, period, subject, data } = req.body;
    const tid = await resolveTeacherId(teacher_id, fio);
    await pool.query(
      `UPDATE ipr_plans SET
         teacher_id=$1, fio=$2, position=$3, organization=$4, category=$5,
         experience=$6, period=$7, subject=$8, data=$9
       WHERE id=$10`,
      [tid, fio, position, organization, category, experience, period, subject, JSON.stringify(data || {}), req.params.id]
    );
    res.json({ success: true, teacher_id: tid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM ipr_plans WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;