const express = require('express');
const router = express.Router();
const statsController = require('../controllers/statsController');
const { authenticateToken } = require('../middleware/auth');

router.get('/dashboard', authenticateToken, (req, res) => statsController.getDashboardStats(req, res));
router.get('/exams-oge-by-subject', authenticateToken, (req, res) => statsController.getExamsOgeBySubject(req, res));
router.get('/exams-ege-by-subject', authenticateToken, (req, res) => statsController.getExamsEgeBySubject(req, res));
router.get('/olympiads-by-subject', authenticateToken, (req, res) => statsController.getOlympiadsBySubject(req, res));
router.get('/vsoh-by-subject', authenticateToken, (req, res) => statsController.getVsohBySubject(req, res));
router.get('/mosh-by-subject', authenticateToken, (req, res) => statsController.getMoshBySubject(req, res));
router.get('/mcko-class-by-subject', authenticateToken, (req, res) => statsController.getMckoClassBySubject(req, res));
router.get('/mcko-teacher-by-subject', authenticateToken, (req, res) => statsController.getMckoTeacherBySubject(req, res));

module.exports = router;