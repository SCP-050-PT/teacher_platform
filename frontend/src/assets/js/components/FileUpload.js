import { createElement } from '../safeHtml.js';
import { api } from '../services/api.js';

export class FileUpload {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            accept: '.xlsx,.xls,.csv,.pdf',
            maxSize: 10 * 1024 * 1024,
            onPreview: null,
            onConfirm: null,
            ...options
        };
        
        this.currentFile = null;
        this.previewData = null;
        this.handlers = {}; // Хранение обработчиков
        
        if (!this.container) {
            throw new Error(`Container #${containerId} not found`);
        }
        
        this.render();
        this.setupListeners();
    }
    
    render() {
        this.container.innerHTML = '';
        
        this.dropZone = createElement('div', null, ['drop-zone']);
        
        const icon = createElement('i', null, ['fas', 'fa-cloud-upload-alt', 'upload-icon']);
        const text = createElement('p', 'Перетащите файл сюда или нажмите для выбора');
        const hint = createElement('span', 'Поддерживаются: Excel (.xlsx, .xls), PDF, CSV', ['upload-hint']);
        const sizeHint = createElement('span', `Максимальный размер: ${(this.options.maxSize / 1024 / 1024).toFixed(0)}MB`, ['upload-size']);
        
        this.dropZone.appendChild(icon);
        this.dropZone.appendChild(text);
        this.dropZone.appendChild(hint);
        this.dropZone.appendChild(sizeHint);
        
        this.fileInput = createElement('input', null, ['file-input']);
        this.fileInput.type = 'file';
        this.fileInput.accept = this.options.accept;
        this.fileInput.style.display = 'none';
        
        this.uploadBtn = createElement('button', 'Загрузить файл', ['btn', 'btn-primary', 'upload-btn']);
        this.uploadBtn.disabled = true;
        
        this.container.appendChild(this.dropZone);
        this.container.appendChild(this.fileInput);
        this.container.appendChild(this.uploadBtn);
    }
    
    setupListeners() {
        // Сохраняем ссылки на обработчики для удаления
        this.handlers.dropZoneClick = () => this.fileInput.click();
        this.handlers.dragOver = (e) => {
            e.preventDefault();
            this.dropZone.classList.add('dragover');
        };
        this.handlers.dragLeave = () => {
            this.dropZone.classList.remove('dragover');
        };
        this.handlers.drop = (e) => {
            e.preventDefault();
            this.dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        };
        this.handlers.fileChange = (e) => {
            if (e.target.files.length) {
                this.handleFile(e.target.files[0]);
            }
        };
        this.handlers.uploadClick = () => this.upload();
        
        // Навешиваем обработчики
        this.dropZone.addEventListener('click', this.handlers.dropZoneClick);
        this.dropZone.addEventListener('dragover', this.handlers.dragOver);
        this.dropZone.addEventListener('dragleave', this.handlers.dragLeave);
        this.dropZone.addEventListener('drop', this.handlers.drop);
        this.fileInput.addEventListener('change', this.handlers.fileChange);
        this.uploadBtn.addEventListener('click', this.handlers.uploadClick);
    }
    
    handleFile(file) {
        if (file.size > this.options.maxSize) {
            this.showError(`Файл слишком большой (макс. ${this.options.maxSize / 1024 / 1024}MB)`);
            return;
        }
        
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        const allowedExts = this.options.accept.split(',');
        if (!allowedExts.includes(ext)) {
            this.showError(`Неподдерживаемый формат. Разрешены: ${this.options.accept}`);
            return;
        }
        
        this.currentFile = file;
        this.renderFileSelected();
    }
    
    renderFileSelected() {
        this.dropZone.innerHTML = '';
        
        const icon = createElement('i', null, ['fas', 'fa-file-excel', 'upload-icon']);
        icon.style.color = '#10b981';
        
        const name = createElement('p', this.currentFile.name);
        const size = createElement('span', `${(this.currentFile.size / 1024).toFixed(1)} KB`, ['upload-hint']);
        
        this.dropZone.appendChild(icon);
        this.dropZone.appendChild(name);
        this.dropZone.appendChild(size);
        
        this.uploadBtn.disabled = false;
    }
    
    async upload() {
        if (!this.currentFile) return;
        
        const fileType = document.getElementById('fileType')?.value;
        const academicYear = document.getElementById('academicYear')?.value;
        
        if (!fileType || !academicYear) {
            this.showError('Выберите тип файла и учебный год');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('fileType', fileType);
            formData.append('academicYear', academicYear);
            
            const data = await api.post('/preview-import', formData);
            
            this.previewData = data;
            
            if (this.options.onPreview) {
                this.options.onPreview(data);
            }
            
        } catch (error) {
            if (error.message?.includes('413') || error.status === 413) {
                this.showError('Файл слишком большой для сервера');
            } else {
                this.showError(error.message);
            }
        } finally {
            this.setLoading(false);
        }
    }
    
    async confirm(previewId) {
        if (!previewId) {
            this.showError('Нет данных для подтверждения');
            return;
        }
        
        this.setLoading(true);
        
        try {
            const result = await api.post('/confirm-import', { previewId });
            
            this.reset();
            
            if (this.options.onConfirm) {
                this.options.onConfirm(result);
            }
            
            return result;
        } catch (error) {
            this.showError(error.message);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }
    
    setLoading(loading) {
        this.uploadBtn.disabled = loading;
        this.uploadBtn.innerHTML = loading 
            ? '<i class="fas fa-spinner fa-spin"></i> Загрузка...'
            : '<i class="fas fa-upload"></i> Загрузить файл';
    }
    
    showError(message) {
        if (window.showNotification) {
            window.showNotification(message, 'error');
        } else {
            alert(message);
        }
    }
    
    reset() {
        this.currentFile = null;
        this.previewData = null;
        this.fileInput.value = '';
        this.render();
        this.setupListeners();
    }
    
    destroy() {
        // Удаляем все обработчики
        if (this.dropZone) {
            this.dropZone.removeEventListener('click', this.handlers.dropZoneClick);
            this.dropZone.removeEventListener('dragover', this.handlers.dragOver);
            this.dropZone.removeEventListener('dragleave', this.handlers.dragLeave);
            this.dropZone.removeEventListener('drop', this.handlers.drop);
        }
        if (this.fileInput) {
            this.fileInput.removeEventListener('change', this.handlers.fileChange);
        }
        if (this.uploadBtn) {
            this.uploadBtn.removeEventListener('click', this.handlers.uploadClick);
        }
        
        this.container.innerHTML = '';
    }
}