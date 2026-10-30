import { createElement } from '../safeHtml.js';

export class Table {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        this.options = {
            columns: [],
            emptyMessage: 'Нет данных',
            onRowClick: null,
            ...options
        };
        
        if (!this.container) {
            throw new Error(`Container #${containerId} not found`);
        }
        
        this.rowHandlers = []; // Для хранения обработчиков строк
    }
    
    render(data) {
        this.container.innerHTML = '';
        this.clearRowHandlers(); // Очищаем старые обработчики
        
        if (!data || data.length === 0) {
            this.renderEmpty();
            return;
        }
        
        const table = createElement('table', null, ['data-table']);
        const thead = this.renderHeader();
        const tbody = this.renderBody(data);
        
        table.appendChild(thead);
        table.appendChild(tbody);
        this.container.appendChild(table);
    }
    
    renderHeader() {
        const thead = document.createElement('thead');
        const tr = document.createElement('tr');
        
        this.options.columns.forEach(col => {
            const th = createElement('th', col.header);
            if (col.width) th.style.width = col.width;
            tr.appendChild(th);
        });
        
        thead.appendChild(tr);
        return thead;
    }
    
    renderBody(data) {
        const tbody = document.createElement('tbody');
        
        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            
            if (this.options.onRowClick) {
                tr.style.cursor = 'pointer';
                const handler = () => this.options.onRowClick(row);
                tr.addEventListener('click', handler);
                this.rowHandlers.push({ element: tr, handler });
            }
            
            this.options.columns.forEach(col => {
                const td = document.createElement('td');
                
                if (col.render) {
                    const rendered = col.render(row, index);
                    if (rendered instanceof HTMLElement) {
                        td.appendChild(rendered);
                    } else if (rendered !== null && rendered !== undefined) {
                        td.textContent = String(rendered);
                    }
                } else {
                    const value = col.field ? this.getNestedValue(row, col.field) : null;
                    td.textContent = value !== undefined && value !== null ? value : '-';
                }
                
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
        
        return tbody;
    }
    
    renderEmpty() {
        const div = createElement('div', this.options.emptyMessage, ['empty-state']);
        const icon = createElement('i', null, ['fas', 'fa-inbox']);
        div.prepend(icon);
        this.container.appendChild(div);
    }
    
    getNestedValue(obj, path) {
        if (!path || typeof path !== 'string') return undefined;
        return path.split('.').reduce((o, p) => o?.[p], obj);
    }
    
    clearRowHandlers() {
        this.rowHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.rowHandlers = [];
    }
    
    destroy() {
        this.clearRowHandlers();
        this.container.innerHTML = '';
    }
}