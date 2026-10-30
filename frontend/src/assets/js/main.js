import { Auth } from './services/auth.js';
import { TeachersPage } from './pages/TeachersPage.js';
import { DashboardPage } from './pages/DashboardPage.js';

// Глобальная функция для совместимости со старым кодом
window.showNotification = (message, type = 'success') => {
    // Импортируем динамически чтобы избежать циклических зависимостей
    import('./services/api.js').then(({ showNotification }) => {
        showNotification(message, type);
    });
};

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    
    // Защита страниц (кроме логина)
    if (!page.includes('login')) {
        Auth.protectPage();
    }
    
    // Инициализация страниц
    switch(page) {
        case 'teachers.html':
            new TeachersPage();
            break;
        case 'index.html':
        case '':
        case '/':
            new DashboardPage();
            break;
        case 'admin-panel.html':
            // Инициализация админки
            break;
    }
});