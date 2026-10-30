import config from '../config.js';

class ApiClient {
    constructor() {
        this.baseUrl = config.API_URL;
        this.controllers = new Map();
    }
    
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.REQUEST_TIMEOUT);
        
        const requestId = Math.random().toString(36).slice(2);
        this.controllers.set(requestId, controller);
        
        const config_fetch = {
            headers: {
                'Accept': 'application/json',
            },
            signal: controller.signal,
            ...options,
        };
        
        // Content-Type только если не FormData
        if (!(options.body instanceof FormData)) {
            config_fetch.headers['Content-Type'] = 'application/json';
        }
        
        // Токен авторизации
        const token = localStorage.getItem('token');
        if (token) {
            config_fetch.headers.Authorization = `Bearer ${token}`;
        }
        
        try {
            const response = await fetch(url, config_fetch);
            
            clearTimeout(timeoutId);
            
            // Обработка 401/403
            if (response.status === 401) {
                this.handleAuthError();
                throw new Error('Сессия истекла. Требуется повторный вход.');
            }
            
            if (response.status === 403) {
                throw new Error('Недостаточно прав для выполнения операции.');
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Пустой ответ
            if (response.status === 204) return null;
            
            return await response.json();
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Превышено время ожидания запроса');
            }
            throw error;
        } finally {
            this.controllers.delete(requestId);
        }
    }
    
    handleAuthError() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
    
    cancelAll() {
        this.controllers.forEach(controller => controller.abort());
        this.controllers.clear();
    }
    
    // HTTP методы
    get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }
    
    post(endpoint, body, options = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: body instanceof FormData ? body : JSON.stringify(body),
            ...options
        });
    }
    
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    }
    
    delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }
}

// Глобальная функция уведомлений (для совместимости)
export const showNotification = (message, type = 'success') => {
    // Удаляем старые уведомления того же типа (опционально)
    const existing = document.querySelectorAll(`.notification.${type}`);
    if (existing.length > 2) {
        existing[0].remove();
    }
    
    const div = document.createElement('div');
    div.className = `notification ${type}`;
    div.textContent = message;
    div.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 9999;
        transition: all 0.3s ease;
        transform: translateX(100%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    document.body.appendChild(div);
    
    // Анимация появления
    requestAnimationFrame(() => {
        div.style.transform = 'translateX(0)';
    });
    
    setTimeout(() => {
        div.style.transform = 'translateX(120%)';
        setTimeout(() => div.remove(), 300);
    }, 3000);
    
    div.addEventListener('click', () => div.remove());
};

export const api = new ApiClient();