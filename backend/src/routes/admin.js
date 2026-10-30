const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { authLimiter } = require('../middleware/rateLimiters');

// Все роуты защищены и требуют роль admin
// Добавлен authLimiter на чувствительные операции

router.get('/users', authenticateToken, requireRole(['admin']), (req, res) => adminController.getUsers(req, res));
router.post('/users', authenticateToken, requireRole(['admin']), authLimiter, (req, res) => adminController.createUser(req, res));
router.delete('/users/:id', authenticateToken, requireRole(['admin']), authLimiter, (req, res) => adminController.deleteUser(req, res));
router.put('/users/:id/reset-password', authenticateToken, requireRole(['admin']), authLimiter, (req, res) => adminController.resetPassword(req, res));

module.exports = router;