import { createElement } from '../safeHtml.js';

export class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        this.overlay = null;
        this.isOpen = false;
        this._escapeHandler = null;
        
        if (!this.modal) {
            throw new Error(`Modal #${modalId} not found`);
        }
        
        this.setupCloseHandlers();
    }
    
    setupCloseHandlers() {
        // Закрытие по клику вне модалки
        this._outsideClickHandler = (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        };
        this.modal.addEventListener('click', this._outsideClickHandler);
        
        // Закрытие по Escape
        this._escapeHandler = (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        };
        document.addEventListener('keydown', this._escapeHandler);
        
        // Кнопка закрытия
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            this._closeBtnHandler = () => this.close();
            closeBtn.addEventListener('click', this._closeBtnHandler);
        }
    }
    
    open() {
        if (this.isOpen) return; // Предотвращаем двойное открытие
        
        this.modal.classList.add('active');
        this.isOpen = true;
        document.body.style.overflow = 'hidden';
        
        // Создаём оверлей
        this.overlay = createElement('div', null, ['modal-overlay']);
        this.overlay.addEventListener('click', () => this.close());
        document.body.appendChild(this.overlay);
    }
    
    close() {
        if (!this.isOpen) return;
        
        this.modal.classList.remove('active');
        this.isOpen = false;
        document.body.style.overflow = '';
        
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }
    }
    
    setTitle(title) {
        const titleEl = this.modal.querySelector('.modal-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }
    
    setContent(content) {
        const contentEl = this.modal.querySelector('.modal-content');
        if (contentEl) {
            contentEl.innerHTML = '';
            if (typeof content === 'string') {
                contentEl.textContent = content;
            } else if (content instanceof HTMLElement) {
                contentEl.appendChild(content);
            }
        }
    }
    
    destroy() {
        this.close();
        
        // Удаляем обработчики
        this.modal.removeEventListener('click', this._outsideClickHandler);
        document.removeEventListener('keydown', this._escapeHandler);
        
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn && this._closeBtnHandler) {
            closeBtn.removeEventListener('click', this._closeBtnHandler);
        }
    }
}