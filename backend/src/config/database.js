const { Pool } = require('pg');
const config = require('./index');

const pool = new Pool({
    host: config.DB_HOST,
    port: config.DB_PORT,
    database: config.DB_NAME,
    user: config.DB_USER,
    password: config.DB_PASSWORD,
});

// Обработка ошибок подключения
pool.on('error', (err) => {
    console.error('❌ Неожиданная ошибка PostgreSQL:', err);
    process.exit(-1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM получен, закрываем пул соединений...');
    pool.end(() => {
        console.log('Пул соединений закрыт');
        process.exit(0);
    });
});

module.exports = {
    pool,
    query: (text, params) => pool.query(text, params),
};