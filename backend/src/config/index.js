require('dotenv').config();

const config = {
    // Server
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    
    // Database
    DB_HOST: process.env.DB_HOST || 'localhost',
    DB_PORT: process.env.DB_PORT || 5432,
    DB_NAME: process.env.DB_NAME,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD, // БЕЗ fallback
    
    // JWT
    JWT_SECRET: process.env.JWT_SECRET, // БЕЗ fallback
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '24h',
    
    // Upload
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv', '.pdf'],
    
    // Rate Limiting
    RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 минут
    RATE_LIMIT_MAX: 100,
    
    // Cache
    PREVIEW_CACHE_MAX_SIZE: 100, // LRU размер
    PREVIEW_CACHE_TTL: 30 * 60 * 1000, // 30 минут
};

// Валидация обязательных переменных
const required = ['DB_PASSWORD', 'JWT_SECRET'];
const missing = required.filter(key => !config[key]);

if (missing.length > 0) {
    console.error(`❌ Отсутствуют обязательные env переменные: ${missing.join(', ')}`);
    process.exit(1);
}

module.exports = config;