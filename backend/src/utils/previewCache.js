const config = require('../config');

/**
 * LRU Cache для preview данных с TTL
 */
class PreviewCache {
    constructor(maxSize = config.PREVIEW_CACHE_MAX_SIZE, ttl = config.PREVIEW_CACHE_TTL) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
        this.timers = new Map();
        
        // Периодическая очистка (каждые 5 минут)
        this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
        
        // Graceful shutdown
        this._setupGracefulShutdown();
    }
    
    _setupGracefulShutdown() {
        const shutdown = () => {
            console.log('🧹 Очистка preview cache перед выходом...');
            this.destroy();
        };
        
        process.on('SIGTERM', shutdown);
        process.on('SIGINT', shutdown);
    }
    
    set(key, value) {
        // Удаляем старую запись если есть
        if (this.cache.has(key)) {
            this.delete(key);
        }
        
        // Удаляем самую старую если превышен лимит
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.delete(oldestKey);
        }
        
        // Сохраняем с метаданными и таймаутом
        const expires = Date.now() + this.ttl;
        const entry = {
            ...value,
            _meta: {
                createdAt: Date.now(),
                expires
            }
        };
        
        const timer = setTimeout(() => {
            this.delete(key);
        }, this.ttl);
        
        this.cache.set(key, entry);
        this.timers.set(key, timer);
        
        return key;
    }
    
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        
        // Проверяем не истёк ли TTL (на случай если setTimeout не сработал)
        if (entry._meta && entry._meta.expires < Date.now()) {
            this.delete(key);
            return null;
        }
        
        // Обновляем порядок (LRU) - удаляем и добавляем заново
        this.cache.delete(key);
        this.cache.set(key, entry);
        
        // Возвращаем без метаданных
        const { _meta, ...value } = entry;
        return value;
    }
    
    delete(key) {
        const timer = this.timers.get(key);
        if (timer) {
            clearTimeout(timer);
            this.timers.delete(key);
        }
        return this.cache.delete(key);
    }
    
    cleanup() {
        // Дополнительная проверка на случай если setTimeout не сработал
        const now = Date.now();
        let cleaned = 0;
        
        for (const [key, entry] of this.cache) {
            if (entry._meta && entry._meta.expires < now) {
                this.delete(key);
                cleaned++;
            }
        }
        
        if (cleaned > 0 || this.cache.size > 0) {
            console.log(`🧹 Cache cleanup: удалено ${cleaned}, осталось ${this.cache.size}`);
        }
    }
    
    destroy() {
        clearInterval(this.cleanupInterval);
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers.clear();
        this.cache.clear();
    }
    
    // Для отладки
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            ttl: this.ttl
        };
    }
}

// Singleton instance
const previewCache = new PreviewCache();

module.exports = previewCache;