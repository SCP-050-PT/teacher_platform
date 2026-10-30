const XLSX = require('xlsx');

class MckoTeachersParser {
    // ===== ИСПРАВЛЕНО: добавлен originalName =====
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(n => /учител/i.test(n)) || workbook.SheetNames[0];
        
        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`MckoTeachersParser: анализ листа "${sheetName}"${originalName ? ` (файл: ${originalName})` : ''}`);
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const diagnostics = [];
        
        let headerRowIndex = -1;
        const headers = {};
        
        for (let i = 0; i < Math.min(10, data.length); i++) {
            const row = data[i];
            if (!row) continue;
            
            const rowStr = row.join(' ').toLowerCase();
            if (rowStr.includes('фио') && rowStr.includes('дата')) {
                headerRowIndex = i;
                
                row.forEach((cell, idx) => {
                    const cellStr = String(cell || '').toLowerCase();
                    
                    if (/фио|учитель/i.test(cellStr)) headers.fio = idx;
                    else if (/дата диагностики/i.test(cellStr)) headers.diagDate = idx;
                    else if (/дата окончания/i.test(cellStr)) headers.endDate = idx;
                    else if (/тип экзамена/i.test(cellStr)) headers.examType = idx;
                    else if (/предмет/i.test(cellStr)) headers.subject = idx;
                    else if (/достигнутый уровень/i.test(cellStr)) headers.level = idx;
                    else if (/публикация результатов/i.test(cellStr)) headers.pubStatus = idx;
                    else if (/дата публикации/i.test(cellStr)) headers.pubDate = idx;
                });
                break;
            }
        }
        
        if (headerRowIndex === -1 || headers.fio === undefined) {
            throw new Error('Не найдены заголовки в файле МЦКО учителей');
        }
        
        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[headers.fio]) continue;
            
            const fio = String(row[headers.fio]).trim();
            if (!fio || fio.toLowerCase().includes('фио') || fio.length < 3) continue;
            
            const diagDate = this.convertExcelDate(row[headers.diagDate]);
            const endDate = this.convertExcelDate(row[headers.endDate]);
            const pubDate = this.convertExcelDate(row[headers.pubDate]);
            
            let subject = row[headers.subject] ? String(row[headers.subject]).trim() : null;
            if (subject) {
                subject = subject.charAt(0).toUpperCase() + subject.slice(1).toLowerCase();
            }
            
            let level = row[headers.level] ? String(row[headers.level]).trim() : null;
            let isPublished = false;
            
            if (level) {
                const levelLower = level.toLowerCase();
                if (levelLower.includes('эксперт')) level = 'Экспертный';
                else if (levelLower.includes('высок')) level = 'Высокий';
                else if (levelLower.includes('повышен')) level = 'Повышенный';
                else if (levelLower.includes('базов')) level = 'Базовый';
                else if (levelLower.includes('низк')) level = 'Низкий';
            }
            
            // Определяем is_published из статуса публикации
            const pubStatus = row[headers.pubStatus] ? String(row[headers.pubStatus]).toLowerCase() : '';
            isPublished = pubStatus.includes('опубликован') || pubStatus.includes('да');
            
            diagnostics.push({
                full_name: fio,
                diagnostic_date: diagDate,
                end_date: endDate,
                exam_type: row[headers.examType] ? String(row[headers.examType]).trim() : null,
                subject: subject,
                level_achieved: level,
                is_published: isPublished,
                publication_date: pubDate,
                academic_year: academicYear
            });
        }
        
        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`MckoTeachersParser: обработано ${diagnostics.length} записей${originalName ? ` в файле ${originalName}` : ''}`);
        
        return diagnostics;
    }
    
    convertExcelDate(excelDate) {
        if (!excelDate) return null;
        
        if (typeof excelDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(excelDate)) {
            return excelDate;
        }
        
        if (typeof excelDate === 'number') {
            const date = new Date((excelDate - 25569) * 86400 * 1000);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        }
        
        if (typeof excelDate === 'string') {
            const parts = excelDate.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
            if (parts) {
                const [, day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
            
            const date = new Date(excelDate);
            if (!isNaN(date.getTime())) {
                return date.toISOString().split('T')[0];
            }
        }
        
        return null;
    }
}

module.exports = new MckoTeachersParser();