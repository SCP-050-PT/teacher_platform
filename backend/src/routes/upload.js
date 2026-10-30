const express = require('express');
const router = express.Router();
const multer = require('multer');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/roles');
const { uploadLimiter } = require('../middleware/rateLimiters');  // ← добавить

// Используем memoryStorage для доступа к buffer
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }  // 10MB
});

// Preview импорта (анализ без записи в БД)
router.post('/preview-import', authenticateToken, requireRole(['admin']), upload.single('file'), (req, res) => uploadController.previewImport(req, res));

// Подтверждение импорта (запись в БД)
router.post('/confirm-import', authenticateToken, requireRole(['admin']), (req, res) => uploadController.confirmImport(req, res));

// Прямой upload (обратная совместимость) — с лимитом
router.post('/', authenticateToken, requireRole(['admin']), uploadLimiter, upload.single('file'), (req, res) => uploadController.upload(req, res));

// История загрузок
router.get('/history', authenticateToken, (req, res) => uploadController.getUploadHistory(req, res));

// Удаление загрузки
router.delete('/history/:id', authenticateToken, requireRole(['admin']), (req, res) => uploadController.deleteUpload(req, res));

module.exports = router;