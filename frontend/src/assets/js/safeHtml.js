/**
 * Экранирование HTML-сущностей для предотвращения XSS
 */
const escapeHtml = (unsafe) => {
    if (typeof unsafe !== 'string') return '';
    
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

/**
 * Создание элемента с безопасным текстом
 */
const createElement = (tag, text, classes = []) => {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (classes.length) el.classList.add(...classes);
    return el;
};

/**
 * Безопасная вставка HTML-шаблона с экранированием данных
 * Использование: safeHtml`<div>${userInput}</div>` — userInput будет экранирован
 */
const safeHtml = (strings, ...values) => {
    return strings.reduce((result, string, i) => {
        const value = values[i];
        if (value === undefined || value === null) return result + string;
        
        // Если значение — массив, рекурсивно обрабатываем
        if (Array.isArray(value)) {
            return result + string + value.join('');
        }
        
        return result + string + escapeHtml(String(value));
    }, '');
};

export { escapeHtml, createElement, safeHtml };