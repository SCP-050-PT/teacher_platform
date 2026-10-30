import { FileUpload } from '../components/FileUpload.js';
import { api } from '../services/api.js';
import { createElement } from '../safeHtml.js';

export class DashboardPage {
    constructor() {
        this.fileUpload = null;
        this.currentPreviewId = null;
        this.handlers = {};
        this.init();
    }
    
    init() {
        this.setupFileUpload();
        this.loadStats();
        this.loadRecentFiles();
    }
    
    setupFileUpload() {
        const container = document.getElementById('uploadContainer');
        if (!container) return;
        
        this.fileUpload = new FileUpload('uploadContainer', {
            onPreview: (data) => this.showPreviewModal(data),
            onConfirm: (result) => {
                this.showNotification('Импорт завершён успешно', 'success');
                this.loadStats();
                this.loadRecentFiles();
                this.currentPreviewId = null; // Сбрасываем после успеха
            }
        });
        
        // Кнопка подтверждения в модалке
        const confirmBtn = document.getElementById('confirmImportBtn');
        if (confirmBtn) {
            this.handlers.confirmClick = () => {
                if (this.currentPreviewId) {
                    this.fileUpload.confirm(this.currentPreviewId).catch(() => {
                        // Ошибка уже показана в fileUpload
                    });
                }
            };
            confirmBtn.addEventListener('click', this.handlers.confirmClick);
        }
        
        // Кнопка закрытия модалки
        const closeBtn = document.getElementById('closePreviewBtn');
        if (closeBtn) {
            this.handlers.closeClick = () => this.closePreviewModal();
            closeBtn.addEventListener('click', this.handlers.closeClick);
        }
    }
    
    showPreviewModal(data) {
        if (!data || !data.stats) {
            console.error('Invalid preview data:', data);
            return;
        }
        
        this.currentPreviewId = data.previewId;
        
        const totalEl = document.getElementById('previewTotal');
        const newEl = document.getElementById('previewNew');
        const dupEl = document.getElementById('previewDup');
        const list = document.getElementById('previewList');
        const modal = document.getElementById('previewModal');
        
        if (!totalEl || !newEl || !dupEl || !list || !modal) {
            console.error('Preview modal elements not found');
            return;
        }
        
        totalEl.textContent = data.stats.totalRecords || 0;
        newEl.textContent = data.stats.newTeachers || 0;
        dupEl.textContent = data.stats.duplicates || 0;
        
        list.innerHTML = '';
        
        if (Array.isArray(data.stats.details)) {
            data.stats.details.forEach(record => {
                const li = createElement('li', null, [
                    record.isNew ? 'new-item' : (record.isDuplicate ? 'dup-item' : '')
                ]);
                
                const fio = createElement('span', record.fio || '-', ['fio']);
                const subject = createElement('span', record.subject || '-', ['subject']);
                
                li.appendChild(fio);
                li.appendChild(subject);
                
                if (record.isNew) {
                    const badge = createElement('span', 'Новый', ['badge', 'badge-new']);
                    li.appendChild(badge);
                }
                
                if (record.isDuplicate) {
                    const badge = createElement('span', 'Дубликат', ['badge', 'badge-dup']);
                    li.appendChild(badge);
                }
                
                list.appendChild(li);
            });
        }
        
        modal.style.display = 'block';
    }
    
    closePreviewModal() {
        const modal = document.getElementById('previewModal');
        if (modal) {
            modal.style.display = 'none';
        }
        this.currentPreviewId = null;
    }
    
    async loadStats() {
        try {
            const stats = await api.get('/stats/dashboard');
            
            const elements = {
                totalTeachers: document.getElementById('totalTeachers'),
                totalCourses: document.getElementById('totalCourses'),
                totalDiagnostics: document.getElementById('totalDiagnostics'),
                totalOlympiads: document.getElementById('totalOlympiads')
            };
            
            if (elements.totalTeachers) elements.totalTeachers.textContent = stats.total_teachers || 0;
            if (elements.totalCourses) elements.totalCourses.textContent = stats.total_courses || 0;
            if (elements.totalDiagnostics) elements.totalDiagnostics.textContent = stats.total_diagnostics || 0;
            if (elements.totalOlympiads) elements.totalOlympiads.textContent = stats.total_olympiads || 0;
            
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
        }
    }
    
    async loadRecentFiles() {
        try {
            const files = await api.get('/upload/history');
            const container = document.getElementById('recentFiles');
            
            if (!container) return;
            
            if (!Array.isArray(files) || files.length === 0) {
                container.innerHTML = '<p class="empty-state">Нет загруженных файлов</p>';
                return;
            }
            
            container.innerHTML = '';
            
            files.slice(0, 5).forEach(file => {
                const item = createElement('div', null, ['file-item']);
                
                const iconDiv = createElement('div', null, ['file-icon']);
                const icon = createElement('i', null, ['fas', 'fa-file-excel']);
                iconDiv.appendChild(icon);
                
                const info = createElement('div', null, ['file-info']);
                const name = createElement('div', file.file_name || 'Без имени', ['file-name']);
                const meta = createElement('div', `${file.file_type || '-'} • ${this.formatDate(file.created_at)}`, ['file-meta']);
                info.appendChild(name);
                info.appendChild(meta);
                
                const statusClass = file.status === 'completed' ? 'success' : 'error';
                const statusText = file.status === 'completed' ? 'Обработан' : 'Ошибка';
                const status = createElement('span', statusText, ['file-status', statusClass]);
                
                item.appendChild(iconDiv);
                item.appendChild(info);
                item.appendChild(status);
                
                container.appendChild(item);
            });
            
        } catch (error) {
            console.error('Ошибка загрузки файлов:', error);
        }
    }
    
    formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('ru-RU');
    }
    
    showNotification(message, type = 'success') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
    
    destroy() {
        // Удаляем обработчики
        const confirmBtn = document.getElementById('confirmImportBtn');
        const closeBtn = document.getElementById('closePreviewBtn');
        
        if (confirmBtn && this.handlers.confirmClick) {
            confirmBtn.removeEventListener('click', this.handlers.confirmClick);
        }
        if (closeBtn && this.handlers.closeClick) {
            closeBtn.removeEventListener('click', this.handlers.closeClick);
        }
        
        // Уничтожаем компоненты
        this.fileUpload?.destroy();
    }
}