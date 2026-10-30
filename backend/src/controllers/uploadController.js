const parserService = require('../services/parserService');
const parsers = require('../parsers');
const db = require('../config/database');

// ===== ДОБАВЛЕНО: функция декодирования имени файла =====
function decodeFilename(originalname) {
    try {
        // Пробуем декодировать из Latin1 (Windows-1251 часто приходит как Latin1)
        const decoded = Buffer.from(originalname, 'latin1').toString('utf8');
        // Проверяем, что декодирование дало осмысленный результат
        if (decoded.includes('�') || /[\x00-\x08\x0E-\x1F]/.test(decoded)) {
            return originalname; // Вернуть как есть, если декодирование испортило
        }
        return decoded;
    } catch (e) {
        return originalname;
    }
}

// Кэш для превью (10 минут)
const previewCache = new Map();

class UploadController {
    // POST /api/preview-import
    async previewImport(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Файл не загружен' });
            }

            // ===== ИСПРАВЛЕНО: декодируем имя файла =====
            const decodedFilename = decodeFilename(req.file.originalname);
            console.log('Original filename:', req.file.originalname);
            console.log('Decoded filename:', decodedFilename);

            const academicYear = req.body.academicYear || '2025/2026';
            let fileType = req.body.fileType || 'auto';

            if (fileType === 'auto') {
                fileType = parsers.fileIdentifier.identify(req.file.buffer, decodedFilename);
            }

            if (fileType === 'unknown') {
                return res.status(400).json({ error: 'Не удалось определить тип файла. Выберите вручную.' });
            }

            const previewResult = await parserService.analyzeFileForPreview(
                req.file.buffer, 
                fileType, 
                academicYear,
                decodedFilename  // ===== ИСПРАВЛЕНО: используем декодированное имя =====
            );

            const previewId = Date.now().toString(36) + Math.random().toString(36).substr(2);

            previewCache.set(previewId, {
                ...previewResult,
                buffer: req.file.buffer,
                fileType,
                academicYear,
                originalname: decodedFilename,  // ===== ИСПРАВЛЕНО: сохраняем декодированное имя =====
                expires: Date.now() + 600000
            });

            res.json({
                success: true,
                previewId,
                fileType,
                totalRecords: previewResult.totalRecords,
                newTeachers: previewResult.newTeachers,
                duplicates: previewResult.duplicates,
                records: previewResult.records.slice(0, 50)
            });

        } catch (error) {
            console.error('Preview error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // POST /api/confirm-import
    async confirmImport(req, res) {
        const { previewId } = req.body;
        const cached = previewCache.get(previewId);

        if (!cached || cached.expires < Date.now()) {
            return res.status(400).json({ error: 'Данные устарели. Загрузите файл заново.' });
        }

        try {
            // Используем cached.originalname (уже декодированное)
            const fileRecord = await db.query(`
                INSERT INTO uploaded_files (file_name, file_type, records_processed, uploaded_by, status, academic_year) 
                VALUES ($1, $2, $3, $4, $5, $6) RETURNING id
            `, [cached.originalname, cached.fileType, 0, req.user.id, 'processing', cached.academicYear]);

            const uploadedFileId = fileRecord.rows[0].id;

            const stats = await parserService.executeImport(
                cached.buffer,
                cached.fileType,
                cached.academicYear,
                uploadedFileId,
                cached.originalname  // Уже декодированное
            );

            await db.query(
                'UPDATE uploaded_files SET records_processed = $1, status = $2 WHERE id = $3',
                [stats.recordsImported, 'completed', uploadedFileId]
            );

            previewCache.delete(previewId);

            res.json({
                success: true,
                message: `Импорт завершен: ${stats.recordsImported} записей добавлено`,
                stats
            });

        } catch (err) {
            console.error('Import error:', err);
            res.status(500).json({ error: 'Ошибка импорта: ' + err.message });
        }
    }

    // POST /api/upload (обратная совместимость)
    async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ error: 'Файл не загружен' });
            }

            // ===== ИСПРАВЛЕНО: декодируем имя файла =====
            const decodedFilename = decodeFilename(req.file.originalname);

            const { fileType, academicYear = '2025/2026' } = req.body;
            
            let type = fileType;
            if (!type || type === 'auto') {
                type = parsers.fileIdentifier.identify(req.file.buffer, decodedFilename);
            }
            
            if (type === 'unknown') {
                return res.status(400).json({ error: 'Не удалось определить тип файла' });
            }
            
            const fileRecord = await db.query(
                'INSERT INTO uploaded_files (file_name, file_type, records_processed, uploaded_by, status, academic_year) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
                [decodedFilename, type, 0, req.user.id, 'processing', academicYear]  // ===== ИСПРАВЛЕНО =====
            );
            const uploadedFileId = fileRecord.rows[0].id;
            
            const stats = await parserService.executeImport(
                req.file.buffer, 
                type, 
                academicYear, 
                uploadedFileId, 
                decodedFilename  // ===== ИСПРАВЛЕНО =====
            );
            
            await db.query(
                'UPDATE uploaded_files SET records_processed = $1, status = $2 WHERE id = $3',
                [stats.recordsImported, 'completed', uploadedFileId]
            );
            
            res.json({
                success: true,
                fileType: type,
                processed: stats.recordsImported,
                stats,
                message: `Обработано ${stats.recordsImported} записей`
            });
            
        } catch (error) {
            console.error('Upload error:', error);
            res.status(500).json({ error: error.message });
        }
    }

    // ... остальные методы без изменений ...
    async getUploadHistory(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const search = req.query.search || '';
            const offset = (page - 1) * limit;

            let whereClause = '';
            let params = [];
            if (search) { 
                whereClause = `WHERE uf.file_name ILIKE $1`; 
                params = [`%${search}%`]; 
            }

            const countQuery = await db.query(`SELECT COUNT(*) FROM uploaded_files uf ${whereClause}`, params);
            const total = parseInt(countQuery.rows[0].count);

            const queryParams = search ? [`%${search}%`, limit, offset] : [limit, offset];
            const query = await db.query(`
                SELECT uf.id, uf.file_name, uf.file_type, uf.records_processed, uf.status, uf.created_at, uf.academic_year,
                       u.full_name as uploaded_by_name, u.username as uploaded_by_username
                FROM uploaded_files uf
                LEFT JOIN users u ON uf.uploaded_by = u.id
                ${whereClause}
                ORDER BY uf.created_at DESC
                LIMIT $${search ? '2' : '1'} OFFSET $${search ? '3' : '2'}
            `, queryParams);

            const formattedRows = query.rows.map(row => ({
                id: row.id, 
                filename: row.file_name, 
                fileType: row.file_type, 
                recordsCount: row.records_processed || 0,
                status: row.status, 
                academicYear: row.academic_year,
                uploadedAt: new Date(row.created_at).toLocaleString('ru-RU', { 
                    day: '2-digit', month: '2-digit', year: 'numeric', 
                    hour: '2-digit', minute: '2-digit' 
                }),
                uploadedBy: row.uploaded_by_name || row.uploaded_by_username || 'Система'
            }));

            res.json({ 
                data: formattedRows, 
                pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } 
            });
        } catch (err) {
            console.error('Upload history error:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    async deleteUpload(req, res) {
        try {
            const { id } = req.params;

            const fileInfo = await db.query(
                'SELECT id, file_name FROM uploaded_files WHERE id = $1',
                [id]
            );

            if (fileInfo.rows.length === 0) {
                return res.status(404).json({ error: 'Файл не найден' });
            }

            await db.query('DELETE FROM uploaded_files WHERE id = $1', [id]);

            res.json({
                success: true,
                message: `Файл "${fileInfo.rows[0].file_name}" и все связанные данные удалены`
            });

        } catch (error) {
            console.error('Delete error:', error);
            res.status(500).json({ error: error.message });
        }
    }
}

module.exports = new UploadController();