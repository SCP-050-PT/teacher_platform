require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const db = require('./config/database');

// Импорт роутов
const authRoutes = require('./routes/auth');
const teacherRoutes = require('./routes/teachers');
const uploadRoutes = require('./routes/upload');
const statsRoutes = require('./routes/stats');
const adminRoutes = require('./routes/admin');

// Импорт middleware
const { apiLimiter } = require('./middleware/rateLimiters');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ============ ИСПРАВЛЕННЫЕ ПУТИ К СТАТИЧЕСКИМ ФАЙЛАМ ============
// Определяем путь к frontend относительно backend/src/server.js
// backend/src/server.js → backend/ → project-root/ → frontend/src/pages
const FRONTEND_PATH = path.join(__dirname, '../../frontend/src');

// Статические файлы
app.use(express.static(path.join(FRONTEND_PATH, 'pages')));
app.use('/assets', express.static(path.join(FRONTEND_PATH, 'assets')));

// Rate limiting
app.use('/api/', apiLimiter);

// Подключение роутов
app.use('/api/auth', authRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);

// ============ ИСПРАВЛЕННЫЕ МАРШРУТЫ ДЛЯ HTML СТРАНИЦ ============
// Главная страница (login)
app.get('/', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'pages', 'login.html'));
});

// Явные маршруты для HTML страниц (если нужен прямой доступ)
app.get('/login', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'pages', 'login.html'));
});

app.get('/index', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'pages', 'index.html'));
});

app.get('/admin-panel', (req, res) => {
    res.sendFile(path.join(FRONTEND_PATH, 'pages', 'admin-panel.html'));
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Маршрут не найден' });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('❌ Global error:', err);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

// Graceful shutdown
const server = app.listen(PORT, () => {
    console.log(`🚀 Сервер: http://localhost:${PORT}`);
    console.log(`📁 Frontend path: ${FRONTEND_PATH}`);
});

process.on('SIGTERM', () => {
    console.log('SIGTERM получен, закрываем сервер...');
    server.close(() => {
        db.pool.end(() => {
            console.log('Пул соединений закрыт');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT получен, закрываем сервер...');
    server.close(() => {
        db.pool.end(() => {
            console.log('Пул соединений закрыт');
            process.exit(0);
        });
    });
});