import { Table } from '../components/Table.js';
import { Modal } from '../components/Modal.js';
import { teachersService } from '../services/teachersService.js';
import { createElement, escapeHtml } from '../safeHtml.js';
import { debounce } from '../utils/helpers.js';

export class TeachersPage {
    constructor() {
        this.currentTeachers = [];
        this.currentProfileId = null;
        this.searchDebounce = debounce(() => this.loadData(), 300);
        this.tabHandlers = [];
        this.init();
    }

    init() {
        this.cacheElements();
        this.setupEventListeners();
        this.setupComponents();
        this.loadData();
    }

    cacheElements() {
        this.searchInput = document.getElementById('searchInput');
        this.subjectFilter = document.getElementById('subjectFilter');
        this.teachersTable = document.getElementById('teachersTable');
    }

    setupEventListeners() {
        this.searchInput?.addEventListener('input', () => this.searchDebounce());
        this.subjectFilter?.addEventListener('change', () => this.loadData());
    }

    setupComponents() {
        // Таблица учителей
        this.table = new Table('teachersTableBody', {
            columns: [
                { field: 'id', header: 'ID', width: '60px' },
                {
                    field: 'full_name',
                    header: 'Учитель',
                    render: (row) => {
                        const div = createElement('div', null, ['teacher-cell']);
                        const avatar = createElement('div', this.getInitials(row.full_name), ['teacher-avatar']);
                        const info = createElement('div', null, ['teacher-info']);
                        const name = createElement('div', row.full_name, ['teacher-name']);
                        const id = createElement('div', `ID: ${row.id}`, ['teacher-id']);

                        info.appendChild(name);
                        info.appendChild(id);
                        div.appendChild(avatar);
                        div.appendChild(info);
                        return div;
                    }
                },
                {
                    field: 'subjects',
                    header: 'Предметы',
                    render: (row) => {
                        const div = createElement('div', null, ['subjects-list']);
                        (row.subjects || []).forEach(subject => {
                            const tag = createElement('span', subject, ['subject-tag']);
                            div.appendChild(tag);
                        });
                        return div;
                    }
                },
                {
                    field: 'stats.courses_count',
                    header: 'Курсы',
                    render: (row) => createElement('span', `${row.stats?.courses_count || 0} курсов`, ['stat-badge'])
                },
                {
                    field: 'stats.diagnostics_count',
                    header: 'Диагностики',
                    render: (row) => createElement('span', `${row.stats?.diagnostics_count || 0}`, ['stat-badge'])
                },
                {
                    header: 'Действия',
                    render: (row) => {
                        const div = createElement('div', null, ['actions']);

                        const viewBtn = createElement('button', 'Профиль', ['btn-action', 'btn-view']);
                        viewBtn.innerHTML = '<i class="fas fa-eye"></i> Профиль';
                        viewBtn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            this.viewProfile(row.id);
                        });

                        div.appendChild(viewBtn);

                        // Кнопка редактирования только для админа
                        if (this.isAdmin()) {
                            const editBtn = createElement('button', '', ['btn-action', 'btn-edit']);
                            editBtn.innerHTML = '<i class="fas fa-edit"></i>';
                            editBtn.addEventListener('click', (e) => {
                                e.stopPropagation();
                                this.editTeacher(row.id);
                            });
                            div.appendChild(editBtn);
                        }

                        return div;
                    }
                }
            ],
            onRowClick: (row) => this.viewProfile(row.id),
            emptyMessage: 'Учителя не найдены'
        });

        // Модалки
        this.profileModal = new Modal('profileModal');
        this.editModal = new Modal('editModal');
    }

    async loadData() {
        try {
            const search = this.searchInput?.value || '';
            const subject = this.subjectFilter?.value || '';

            const data = await teachersService.getAll({ search, subject });
            this.currentTeachers = data.data || data; // поддержка пагинации

            this.table.render(this.currentTeachers);
        } catch (error) {
            console.error('Ошибка загрузки учителей:', error);
            // Показать ошибку пользователю
        }
    }

    async viewProfile(id) {
        this.currentProfileId = id;

        try {
            const profile = await teachersService.getById(id);

            // Заполняем модалку безопасно (textContent)
            document.getElementById('modalName').textContent = profile.full_name;
            document.getElementById('modalSubject').textContent = (profile.subjects || []).join(', ');
            document.getElementById('modalAvatar').textContent = this.getInitials(profile.full_name);

            document.getElementById('statCourses').textContent = profile.stats?.courses_count || 0;
            document.getElementById('statDiagnostics').textContent = profile.stats?.diagnostics_count || 0;
            document.getElementById('statOlympiads').textContent = profile.stats?.olympiads_count || 0;

            // Табы
            this.renderTabs(profile);

            this.profileModal.open();

        } catch (error) {
            console.error('Ошибка загрузки профиля:', error);
        }
    }

    renderTabs(profile) {
        const tabs = ['courses', 'diagnostics', 'olympiads', 'exams-oge', 'exams-ege', 'other'];
        const container = document.getElementById('tabContent');

        // Очищаем старые обработчики
        this.tabHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.tabHandlers = [];

        // Рендер первого таба
        this.renderTabContent('courses', profile, container);

        // Обработчики табов
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const handler = () => {
                const tab = btn.dataset.tab;
                this.renderTabContent(tab, profile, container);

                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            };

            btn.addEventListener('click', handler);
            this.tabHandlers.push({ element: btn, handler });
        });
    }

    renderTabContent(tab, profile, container) {
        container.innerHTML = '';

        const data = profile[`${tab}`] || [];

        if (!data.length) {
            container.appendChild(this.createEmptyState(`Нет данных о ${this.getTabName(tab)}`));
            return;
        }

        // Универсальная таблица для таба
        const table = this.createDataTable(tab, data);
        container.appendChild(table);
    }

    createDataTable(tab, data) {
        const table = createElement('table', null, ['data-table']);
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');

        // Заголовки в зависимости от типа
        const headers = this.getHeadersForTab(tab);
        const tr = document.createElement('tr');
        headers.forEach(h => {
            tr.appendChild(createElement('th', h));
        });
        thead.appendChild(tr);

        // Данные
        data.forEach(item => {
            const row = document.createElement('tr');
            const cells = this.getCellsForTab(tab, item);
            cells.forEach(cell => {
                const td = document.createElement('td');
                if (typeof cell === 'string' || typeof cell === 'number') {
                    td.textContent = cell;
                } else {
                    td.appendChild(cell);
                }
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        table.appendChild(thead);
        table.appendChild(tbody);
        return table;
    }

    getHeadersForTab(tab) {
        const map = {
            courses: ['Курс', 'Организация', 'Дата окончания'],
            diagnostics: ['Дата', 'Предмет', 'Тип', 'Уровень'],
            olympiads: ['Олимпиада', 'Предмет', 'Участников', 'Победители', 'Призёры'],
            'exams-oge': ['Предмет', 'Учеников', '2', '3', '4', '5'],
            'exams-ege': ['Предмет', 'Учеников', '<min', '0-59', '60-79', '80-100'],
            other: ['Тип', 'Описание', 'Дата']
        };
        return map[tab] || ['Данные'];
    }

    getCellsForTab(tab, item) {
        switch (tab) {
            case 'courses':
                return [
                    createElement('strong', item.course_name),
                    item.organization || '-',
                    item.completion_date ? new Date(item.completion_date).toLocaleDateString('ru-RU') : '-'
                ];
            case 'diagnostics':
                return [
                    item.diagnostic_date ? new Date(item.diagnostic_date).toLocaleDateString('ru-RU') : '-',
                    item.subject || '-',
                    item.exam_type || '-',
                    item.level_achieved || '-'
                ];
            case 'olympiads':
                return [
                    item.olympiad_name,
                    item.subject || '-',
                    item.total_participants || 0,
                    item.winners_count || 0,
                    item.prize_winners_count || 0
                ];
            case 'exams-oge':
                return [
                    item.subject || '-',
                    item.total_students || 0,
                    item.grade_2_count || 0,
                    item.grade_3_count || 0,
                    item.grade_4_count || 0,
                    item.grade_5_count || 0
                ];
            case 'exams-ege':
                return [
                    item.subject || '-',
                    item.total_students || 0,
                    item.threshold_lt_count || 0,
                    item.threshold_0_59_count || 0,
                    item.threshold_60_79_count || 0,
                    item.threshold_80_100_count || 0
                ];
            default:
                return [JSON.stringify(item)];
        }
    }
    destroy() {
        // Очищаем обработчики табов
        this.tabHandlers.forEach(({ element, handler }) => {
            element.removeEventListener('click', handler);
        });
        this.tabHandlers = [];

        // Уничтожаем компоненты
        this.table?.destroy();
        this.profileModal?.destroy();
        this.editModal?.destroy();
    }
    createEmptyState(message) {
        const div = createElement('div', null, ['empty-state']);
        const icon = createElement('i', null, ['fas', 'fa-inbox']);
        const text = createElement('p', message);
        div.appendChild(icon);
        div.appendChild(text);
        return div;
    }

    editTeacher(id) {
        const teacher = this.currentTeachers.find(t => t.id === id);
        if (!teacher) return;

        document.getElementById('editId').value = teacher.id;
        document.getElementById('editName').value = teacher.full_name;
        document.getElementById('editSubjects').value = (teacher.subjects || []).join(', ');

        this.editModal.open();
    }

    async saveTeacher() {
        const id = document.getElementById('editId').value;
        const full_name = document.getElementById('editName').value.trim();
        const subjectsStr = document.getElementById('editSubjects').value;

        if (!full_name || full_name.length < 2) {
            alert('ФИО обязательно (минимум 2 символа)');
            return;
        }

        const subjects = subjectsStr.split(',').map(s => s.trim()).filter(s => s);

        try {
            await teachersService.update(id, { full_name, subjects });
            this.editModal.close();
            this.loadData();
            window.showNotification?.('Учитель обновлён', 'success');
        } catch (error) {
            window.showNotification?.(error.message, 'error');
        }
    }

    async deleteTeacher() {
        if (!confirm('Вы уверены, что хотите удалить этого учителя?')) return;

        const id = document.getElementById('editId').value;

        try {
            await teachersService.delete(id);
            this.editModal.close();
            this.loadData();
            window.showNotification?.('Учитель удалён', 'success');
        } catch (error) {
            window.showNotification?.(error.message, 'error');
        }
    }

    getInitials(name) {
        if (!name) return '??';
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }

    getTabName(tab) {
        const names = {
            courses: 'курсах',
            diagnostics: 'диагностиках',
            exams: 'экзаменах',
            olympiads: 'олимпиадах',
            other: 'ином'
        };
        return names[tab] || tab;
    }

    isAdmin() {
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            return user.role === 'admin';
        } catch {
            return false;
        }
    }
}