const XLSX = require('xlsx');

class OlympiadParser {
    // ===== ИСПРАВЛЕНО: добавлен originalName =====
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const results = [];
        
        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`OlympiadParser (МОШ): начало обработки${originalName ? ` файла ${originalName}` : ''}`);
        
        // Перебираем все листы (параллели классов: "7 параллель", "9 параллель")
        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            
            // Извлекаем номер параллели из названия листа
            const parallelMatch = sheetName.match(/(\d+)/);
            const parallel = parallelMatch ? parseInt(parallelMatch[1]) : null;
            
            // Ищем строку с заголовками (обычно 3-я строка: "Результат | Учитель")
            let headerRow = -1;
            let studentCol = -1, classCol = -1;
            let olympiadGroups = []; // [{name: '...', resultCol: X, teacherCol: Y}]
            
            for (let i = 0; i < Math.min(10, data.length); i++) {
                const row = data[i];
                if (!row || row.length < 3) continue;
                
                const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
                
                // Ищем строку с "Результат" и "Учитель" — это заголовки колонок
                if (rowStr.includes('результат') && rowStr.includes('учитель')) {
                    headerRow = i;
                    
                    // Анализируем структуру — ищем пары "Результат | Учитель"
                    for (let idx = 0; idx < row.length - 1; idx++) {
                        const cell = row[idx];
                        const nextCell = row[idx + 1];
                        
                        if (!cell) continue;
                        
                        const cellStr = String(cell).toLowerCase().trim();
                        const nextCellStr = String(nextCell || '').toLowerCase().trim();
                        
                        // Если текущая ячейка "Результат", а следующая "Учитель"
                        if (cellStr === 'результат' && nextCellStr === 'учитель') {
                            // Название олимпиады — в строке выше (headerRow - 1) в той же колонке
                            let olympiadName = '';
                            if (i > 0 && data[i-1] && data[i-1][idx]) {
                                olympiadName = String(data[i-1][idx]).trim();
                            }
                            
                            olympiadGroups.push({
                                name: olympiadName || `Олимпиада ${idx}`,
                                resultCol: idx,
                                teacherCol: idx + 1
                            });
                        }
                    }
                    
                    // Если не нашли по точному совпадению, ищем по паттерну
                    if (olympiadGroups.length === 0) {
                        for (let idx = 2; idx < row.length - 1; idx++) {
                            const cell = row[idx];
                            const nextCell = row[idx + 1];
                            
                            if (!cell || !nextCell) continue;
                            
                            const cellStr = String(cell).toLowerCase().trim();
                            const nextCellStr = String(nextCell).toLowerCase().trim();
                            
                            if (cellStr.includes('результат') && nextCellStr.includes('учитель')) {
                                let olympiadName = '';
                                // Ищем название в строках выше
                                for (let h = i - 1; h >= Math.max(0, i - 3); h--) {
                                    if (data[h] && data[h][idx] && String(data[h][idx]).trim()) {
                                        olympiadName = String(data[h][idx]).trim();
                                        break;
                                    }
                                }
                                
                                olympiadGroups.push({
                                    name: olympiadName,
                                    resultCol: idx,
                                    teacherCol: idx + 1
                                });
                            }
                        }
                    }
                    
                    // Определяем колонки ФИО и Класс (обычно первые 2)
                    for (let idx = 0; idx < row.length; idx++) {
                        const cellStr = String(row[idx] || '').toLowerCase();
                        if (cellStr.includes('фио')) studentCol = idx;
                        else if (cellStr.includes('класс')) classCol = idx;
                    }
                    
                    // Если не нашли в текущей строке, ищем в предыдущих
                    if (studentCol === -1 || classCol === -1) {
                        for (let h = Math.max(0, i - 2); h < i; h++) {
                            if (!data[h]) continue;
                            for (let idx = 0; idx < data[h].length; idx++) {
                                const cellStr = String(data[h][idx] || '').toLowerCase();
                                if (studentCol === -1 && cellStr.includes('фио')) studentCol = idx;
                                if (classCol === -1 && cellStr.includes('класс')) classCol = idx;
                            }
                        }
                    }
                    
                    break;
                }
            }
            
            if (headerRow === -1 || olympiadGroups.length === 0) {
                console.log(`OlympiadParser: пропускаем лист ${sheetName}: не найдены заголовки`);
                return;
            }
            
            console.log(`OlympiadParser: лист ${sheetName}: найдено ${olympiadGroups.length} олимпиад, ФИО в колонке ${studentCol}, Класс в колонке ${classCol}`);
            
            // Парсим данные (начинаем со следующей строки после заголовков)
            for (let i = headerRow + 1; i < data.length; i++) {
                const row = data[i];
                if (!row || !row[studentCol]) continue;
                
                const studentName = String(row[studentCol]).trim();
                if (!studentName || studentName.length < 3) continue;
                if (/всего|итого|фио|класс/i.test(studentName.toLowerCase())) continue;
                
                const className = classCol !== -1 && row[classCol] ? String(row[classCol]).trim() : '';
                
                olympiadGroups.forEach(group => {
                    // Проверяем что колонки существуют в строке
                    if (group.resultCol >= row.length || group.teacherCol >= row.length) return;
                    
                    const result = row[group.resultCol];
                    const teacher = row[group.teacherCol];
                    
                    // Пропускаем если нет результата И учителя
                    if (!result && !teacher) return;
                    
                    const resultStr = result ? String(result).toLowerCase().trim() : '';
                    const teacherStr = teacher ? String(teacher).trim() : '';
                    
                    // Определяем статус
                    let status = 'участник';
                    if (resultStr.includes('побед')) status = 'победитель';
                    else if (resultStr.includes('приз')) status = 'призер';
                    else if (resultStr.includes('1') || resultStr.includes('i')) status = 'победитель';
                    else if (resultStr.includes('2') || resultStr.includes('3') || resultStr.includes('ii') || resultStr.includes('iii')) status = 'призер';
                    
                    // Если есть учитель, разделяем (может быть несколько)
                    if (teacherStr) {
                        const teachers = this.splitTeachers(teacherStr);
                        
                        teachers.forEach(t => {
                            results.push({
                                full_name: t,
                                olympiad_name: 'МОШ',
                                olympiad_type: 'МОШ',
                                subject: this.extractSubject(group.name),
                                parallel: parallel,
                                class_name: className,
                                result: status,
                                student: studentName,
                                academic_year: academicYear
                            });
                        });
                    }
                });
            }
        });
        
        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`OlympiadParser: всего найдено ${results.length} записей МОШ${originalName ? ` в файле ${originalName}` : ''}`);
        
        return results;
    }
    
    // Разделение ФИО учителей
    splitTeachers(teacherStr) {
        if (!teacherStr) return [];
        
        // Разделители: / , и &
        const separators = /[\/,]|\s+и\s+|&/;
        const parts = teacherStr.split(separators).map(t => t.trim()).filter(t => t.length > 2);
        
        // Если разделение не сработало, возвращаем как есть
        if (parts.length === 0) return [teacherStr];
        
        return parts;
    }
    
    extractSubject(olympiadName) {
        if (!olympiadName) return 'Общий';
        
        const name = olympiadName.toLowerCase();
        
        // Список предметов с ключевыми словами
        const subjects = [
            { name: 'Математика', keywords: ['математ', 'вертикал', 'праздник', 'геометр', 'алгебр'] },
            { name: 'География', keywords: ['географ'] },
            { name: 'Филология', keywords: ['филолог', 'лингвист', 'русск', 'литератур', 'язык'] },
            { name: 'Обществознание', keywords: ['обществ', 'эконом', 'право'] },
            { name: 'Физика', keywords: ['физик'] },
            { name: 'Информатика', keywords: ['информат', 'программир', 'айти', 'it'] },
            { name: 'Химия', keywords: ['хими'] },
            { name: 'Биология', keywords: ['биолог', 'эколог'] },
            { name: 'История', keywords: ['истори'] },
            { name: 'Английский язык', keywords: ['англ', 'иностранн', 'немецк', 'французск'] },
            { name: 'Астрономия', keywords: ['астроном'] },
            { name: 'Технология', keywords: ['технолог', 'робототехник'] }
        ];
        
        for (const subject of subjects) {
            if (subject.keywords.some(k => name.includes(k))) {
                return subject.name;
            }
        }
        
        return 'Общий';
    }
}

module.exports = new OlympiadParser();