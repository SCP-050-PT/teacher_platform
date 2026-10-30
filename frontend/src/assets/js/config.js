// Единый конфиг для frontend
const config = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:5000/api' 
        : '/api', // Для production — относительный путь
    
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['.xlsx', '.xls', '.csv', '.pdf'],
    
    // Таймауты
    REQUEST_TIMEOUT: 30000, // 30 секунд
    NOTIFICATION_DURATION: 3000,
};

// Валидация env (для development)
if (window.location.hostname === 'localhost' && !config.API_URL.includes('localhost')) {
    console.warn('⚠️  Проверьте API_URL для локальной разработки');
}

export default config;