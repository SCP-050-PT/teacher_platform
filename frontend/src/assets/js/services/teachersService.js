import { api } from './api.js';

export const teachersService = {
    async getAll(params = {}) {
        const query = new URLSearchParams();
        if (params.search) query.append('search', params.search);
        if (params.subject) query.append('subject', params.subject);
        if (params.page) query.append('page', params.page);
        if (params.limit) query.append('limit', params.limit);
        
        const queryString = query.toString();
        return api.get(`/teachers${queryString ? '?' + queryString : ''}`);
    },
    
    async getById(id) {
        return api.get(`/teachers/${id}`);
    },
    
    async create(data) {
        return api.post('/teachers', data);
    },
    
    async update(id, data) {
        return api.put(`/teachers/${id}`, data);
    },
    
    async delete(id) {
        return api.delete(`/teachers/${id}`);
    },
    
    // ========== УДАЛЕНИЕ ОТДЕЛЬНЫХ ЗАПИСЕЙ ==========
    
    async deleteCourse(teacherId, courseId) {
        return api.delete(`/teachers/${teacherId}/courses/${courseId}`);
    },
    
    async deleteDiagnostic(teacherId, diagId) {
        return api.delete(`/teachers/${teacherId}/diagnostics/${diagId}`);
    },
    
    async deleteMckoDiagnostic(teacherId, diagId) {
        return api.delete(`/teachers/${teacherId}/mcko-diagnostics/${diagId}`);
    },
    
    async deleteOlympiad(teacherId, olympId) {
        return api.delete(`/teachers/${teacherId}/olympiads/${olympId}`);
    },
    
    async deleteExamOge(teacherId, examId) {
        return api.delete(`/teachers/${teacherId}/exam-results-oge/${examId}`);
    },
    
    async deleteExamEge(teacherId, examId) {
        return api.delete(`/teachers/${teacherId}/exam-results-ege/${examId}`);
    },
    
    async deleteOtherDoc(teacherId, docId) {
        return api.delete(`/teachers/${teacherId}/other-docs/${docId}`);
    },
    
    // ========== PDF ЭКСПОРТ ==========
    
    async exportPdf(id) {
        // Используем fetch напрямую для blob
        const token = localStorage.getItem('token');
        const baseUrl = api.baseUrl || '';
        
        const response = await fetch(`${baseUrl}/teachers/${id}/pdf`, {
            method: 'GET',
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Accept': 'application/pdf'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Ошибка загрузки PDF');
        }
        
        return response.blob();
    }
};