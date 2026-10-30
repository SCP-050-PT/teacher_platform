const XLSX = require('xlsx');

class EgeParser {
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        let sheetName = workbook.SheetNames.find(n => /статистика|учител|егэ|ege/i.test(n));
        
        if (!sheetName) {
            sheetName = workbook.SheetNames[0];
        }
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        console.log(`EgeParser: анализ листа "${sheetName}"${originalName ? ` (файл: ${originalName})` : ''}, строк: ${data.length}`);

        return this.parseEge(data, academicYear);
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

    parseEge(data, academicYear) {
        const results = [];
        let currentSubject = '';
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            const nextRow = data[i + 1];
            
            // Если текущая строка похожа на предмет, а следующая на "ФИО"
            if (this.isSubjectRow(row) && nextRow && this.isFioHeader(nextRow)) {
                currentSubject = String(row[0]).trim();
                console.log(`EgeParser: найден предмет "${currentSubject}" на строке ${i}`);
                continue;
            }
            
            // Пропускаем заголовок "ФИО"
            if (this.isFioHeader(row)) {
                continue;
            }
            
            // Проверяем что это строка с учителем
            if (this.isTeacherRow(row)) {
                if (!currentSubject) {
                    console.log(`EgeParser: пропуск строки ${i} - нет предмета для ${row[0]}`);
                    continue;
                }
                
                const fio = String(row[0]).trim();
                
                // Читаем значения по фиксированным позициям колонок
                // row[1] = колонка B (< min)
                // row[2] = колонка C (0-59)
                // row[3] = колонка D (60-79)
                // row[4] = колонка E (80-100)
                const lt = parseInt(row[1]) || 0;
                const t0_59 = parseInt(row[2]) || 0;
                const t60_79 = parseInt(row[3]) || 0;
                const t80_100 = parseInt(row[4]) || 0;
                
                const totalStudents = lt + t0_59 + t60_79 + t80_100;
                
                // Проверяем что есть хотя бы один ученик
                if (totalStudents === 0) {
                    console.log(`EgeParser: пропуск строки ${i} (${fio}), нет данных`);
                    continue;
                }

                console.log(`EgeParser: ДОБАВЛЕНО ${fio} - предмет="${currentSubject}", [<${lt}, 0-59=${t0_59}, 60-79=${t60_79}, 80-100=${t80_100}] = ${totalStudents}`);

                const teachers = this.splitTeachers(fio);
                
                teachers.forEach(teacher => {
                    results.push({
                        full_name: teacher,
                        subject: currentSubject,
                        academic_year: academicYear,
                        total_students: totalStudents,
                        threshold_lt_count: lt,
                        threshold_0_59_count: t0_59,
                        threshold_60_79_count: t60_79,
                        threshold_80_100_count: t80_100
                    });
                });
            }
        }

        console.log(`EgeParser: обработано ${results.length} записей`);
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

module.exports = new EgeParser();