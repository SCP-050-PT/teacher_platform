const { rateLimit } = require('express-rate-limit');

// Общий лимит API
const apiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 100,
    message: { error: 'Слишком много запросов к API.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Лимит на авторизацию
const authLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 минута
    max: 5,
    message: { error: 'Слишком много попыток входа. Попробуйте через минуту.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Лимит на загрузку файлов
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 час
    max: 10,
    message: { error: 'Слишком много загрузок файлов. Лимит: 10 в час.' },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
    uploadLimiter
};