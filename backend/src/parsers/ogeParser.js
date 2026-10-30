const XLSX = require('xlsx');

class OgeParser {
    // ===== ИСПРАВЛЕНО: добавлен originalName =====
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        let sheetName = workbook.SheetNames.find(n => /статистика|учител|огэ|oge/i.test(n));
        
        if (!sheetName) {
            sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`OgeParser: анализ листа "${sheetName}"${originalName ? ` (файл: ${originalName})` : ''}, строк: ${data.length}`);

        return this.parseOge(data, academicYear, originalName);
    }

    // Проверяем что строка содержит "ФИО" (заголовок таблицы)
    isFioHeader(row) {
        if (!row || row.length === 0) return false;
        const firstCell = String(row[0] || '').trim().toLowerCase();
        return firstCell === 'фио';
    }

    // Проверяем что строка - это данные учителя
    isTeacherRow(row) {
        if (!row || row.length === 0) return false;
        
        const firstCell = String(row[0] || '').trim();
        if (!firstCell) return false;
        
        // Должно быть ФИО (содержит точки или два слова с заглавной)
        const hasInitials = firstCell.includes('.');
        const hasTwoWords = /^[А-Я][а-я]+\s+[А-Я]/i.test(firstCell);
        
        if (!hasInitials && !hasTwoWords) return false;
        
        // Исключаем служебные строки
        if (/всего|итого|учитель|предмет/i.test(firstCell.toLowerCase())) return false;
        
        return true;
    }

    // Проверяем что строка - это предмет
    isSubjectRow(row, nextRow) {
        if (!row || row.length === 0) return false;
        
        const firstCell = String(row[0] || '').trim();
        if (!firstCell) return false;
        
        // Не должно быть ФИО, цифр, точек (как в ФИО)
        if (firstCell.toLowerCase() === 'фио') return false;
        if (firstCell.includes('.')) return false;
        if (/^\d/.test(firstCell)) return false;
        
        // Длина названия предмета
        if (firstCell.length < 3 || firstCell.length > 50) return false;
        
        return true;
    }

    // ===== ИСПРАВЛЕНО: добавлен originalName в параметры =====
    parseOge(data, academicYear, originalName) {
        const results = [];
        let currentSubject = '';
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const nextRow = data[i + 1];
            
            // Если текущая строка похожа на предмет, а следующая на "ФИО"
            if (this.isSubjectRow(row) && nextRow && this.isFioHeader(nextRow)) {
                currentSubject = String(row[0]).trim();
                console.log(`OgeParser: найден предмет "${currentSubject}" на строке ${i}`);
                continue;
            }
            
            // Пропускаем заголовок "ФИО"
            if (this.isFioHeader(row)) {
                continue;
            }
            
            // Проверяем что это строка с учителем
            if (this.isTeacherRow(row)) {
                if (!currentSubject) {
                    console.log(`OgeParser: пропуск строки ${i} - нет предмета для ${row[0]}`);
                    continue;
                }
                
                const fio = String(row[0]).trim();
                
                // Читаем значения по фиксированным позициям колонок
                // row[1] = колонка B (оценка 2)
                // row[2] = колонка C (оценка 3)
                // row[3] = колонка D (оценка 4)
                // row[4] = колонка E (оценка 5)
                const g2 = parseInt(row[1]) || 0;
                const g3 = parseInt(row[2]) || 0;
                const g4 = parseInt(row[3]) || 0;
                const g5 = parseInt(row[4]) || 0;
                
                const totalStudents = g2 + g3 + g4 + g5;
                
                // Проверяем что есть хотя бы одна оценка
                if (totalStudents === 0) {
                    console.log(`OgeParser: пропуск строки ${i} (${fio}), нет оценок`);
                    continue;
                }

                console.log(`OgeParser: ДОБАВЛЕНО ${fio} - предмет="${currentSubject}", [${g2}, ${g3}, ${g4}, ${g5}] = ${totalStudents}`);

                const teachers = this.splitTeachers(fio);
                
                teachers.forEach(teacher => {
                    results.push({
                        full_name: teacher,
                        subject: currentSubject,
                        academic_year: academicYear,
                        total_students: totalStudents,
                        grade_2_count: g2,
                        grade_3_count: g3,
                        grade_4_count: g4,
                        grade_5_count: g5
                    });
                });
            }
        }

        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`OgeParser: обработано ${results.length} записей${originalName ? ` в файле ${originalName}` : ''}`);
        
        return results;
    }

    splitTeachers(teacherStr) {
        if (!teacherStr) return [];
        const separators = /[\/,]|\s+и\s+|&/;
        const parts = teacherStr.split(separators).map(t => t.trim()).filter(t => t.length > 2);
        if (parts.length === 0) return [teacherStr];
        return parts;
    }
}

module.exports = new OgeParser();