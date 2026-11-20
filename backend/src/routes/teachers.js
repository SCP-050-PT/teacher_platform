const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');

// ==================== CRUD УЧИТЕЛЕЙ ====================

// GET /api/teachers — список учителей (с пагинацией и фильтрами)
router.get('/', authenticateToken, (req, res) => teacherController.getAll(req, res));

// GET /api/teachers/short — лёгкий список для выбора в формах (ДО /:id !)
router.get('/short', authenticateToken, (req, res) => teacherController.getShort(req, res));

// GET /api/teachers/:id — профиль учителя
router.get('/:id', authenticateToken, (req, res) => teacherController.getById(req, res));

// POST /api/teachers — создать учителя (только admin)
router.post('/', authenticateToken, requireRole(['admin']), (req, res) => teacherController.create(req, res));

// PUT /api/teachers/:id — обновить учителя (только admin)
router.put('/:id', authenticateToken, requireRole(['admin']), (req, res) => teacherController.update(req, res));

// DELETE /api/teachers/:id — удалить учителя (только admin)
router.delete('/:id', authenticateToken, requireRole(['admin']), (req, res) => teacherController.remove(req, res));

// ==================== PDF ====================

router.get('/:id/pdf', authenticateToken, (req, res) => teacherController.generatePdf(req, res));

// ==================== УДАЛЕНИЕ ОТДЕЛЬНЫХ ЗАПИСЕЙ ====================

router.delete('/:teacherId/courses/:courseId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteCourse(req, res));
router.delete('/:teacherId/diagnostics/:diagId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteDiagnostic(req, res));
router.delete('/:teacherId/mcko-diagnostics/:diagId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteMckoDiagnostic(req, res));
router.delete('/:teacherId/olympiads/:olympId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteOlympiad(req, res));
router.delete('/:teacherId/exam-results-oge/:examId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteExamOge(req, res));
router.delete('/:teacherId/exam-results-ege/:examId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteExamEge(req, res));
router.delete('/:teacherId/other-docs/:docId', authenticateToken, requireRole(['admin']), (req, res) => teacherController.deleteOtherDoc(req, res));

module.exports = router;
