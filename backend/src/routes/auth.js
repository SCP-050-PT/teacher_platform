const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { authLimiter } = require('../middleware/rateLimiters');

// Публичные
router.post('/login', authLimiter, (req, res) => adminController.login(req, res));

// Защищенные
router.get('/me', authenticateToken, (req, res) => adminController.getMe(req, res));
router.put('/change-password', authenticateToken, (req, res) => adminController.changePassword(req, res));
router.put('/change-username', authenticateToken, (req, res) => adminController.changeUsername(req, res));

module.exports = router;