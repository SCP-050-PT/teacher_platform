const XLSX = require('xlsx');

class MckoClassParser {
    parse(buffer, academicYear = '2025/2026', fileName = '') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames.find(n => /сводн/i.test(n)) || workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const results = [];
        
        // Извлекаем предмет из имени файла
        let subject = this.extractSubjectFromFilename(fileName);
        console.log(`MckoClassParser: предмет из имени файла "${fileName}": ${subject}`);
        
        let headerRowIndex = -1;
        let classCol = -1, countCol = -1, qualityCol = -1, teacherCol = -1;
        let belowCol = -1, basicCol = -1, advancedCol = -1, highCol = -1;

        // ===== ИСПРАВЛЕНО: ищем заголовки в первых 15 строках =====
        for (let i = 0; i < Math.min(15, data.length); i++) {
            const row = data[i];
            if (!row) continue;
            
            const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
            
            // Ищем строку с "Класс" и "Учитель"
            if ((rowStr.includes('класс') || rowStr.includes('учитель')) && 
                (rowStr.includes('качество') || rowStr.includes('количество') || rowStr.includes('писавших'))) {
                headerRowIndex = i;
                
                row.forEach((cell, idx) => {
                    const cellStr = String(cell || '').toLowerCase();
                    
                    if (/класс/i.test(cellStr) && !cellStr.includes('наименование')) classCol = idx;
                    else if (/кол-во|количество|писавших|всего/i.test(cellStr)) countCol = idx;
                    else if (/качество/i.test(cellStr) && !cellStr.includes('знаний')) qualityCol = idx;
                    else if (/% выполнения|процент|качество знаний/i.test(cellStr)) qualityCol = idx;
                    else if (/учитель/i.test(cellStr)) teacherCol = idx;
                });
                
                console.log(`MckoClassParser: заголовки в строке ${i}, Класс=${classCol}, Учитель=${teacherCol}, Качество=${qualityCol}`);
                break;
            }
        }

        // ===== ИСПРАВЛЕНО: если "Качество" не найдено в первой строке, ищем во второй =====
        if (qualityCol === -1 && headerRowIndex !== -1) {
            for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 3, data.length); i++) {
                const row = data[i];
                if (!row) continue;
                
                row.forEach((cell, idx) => {
                    const cellStr = String(cell || '').toLowerCase();
                    if (/качество/i.test(cellStr) && !cellStr.includes('знаний')) {
                        qualityCol = idx;
                        console.log(`MckoClassParser: "Качество" найдено в строке ${i}, колонка ${idx}`);
                    }
                });
                
                if (qualityCol !== -1) break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error('Не найдены заголовки в сводной таблице МЦКО');
        }

        // Ищем строку с уровнями (ниже базового, базовый, повышенный, высокий)
        let levelsRowIndex = -1;
        for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, data.length); i++) {
            const row = data[i];
            if (!row) continue;
            
            const rowStr = row.map(c => String(c || '').toLowerCase()).join(' ');
            
            // Проверяем, что это строка с уровнями, а не данные
            if ((rowStr.includes('ниже базового') || rowStr.includes('базовый')) && 
                !row[classCol]) { // В строке с уровнями нет названия класса
                
                levelsRowIndex = i;
                row.forEach((cell, idx) => {
                    const cellStr = String(cell || '').toLowerCase();
                    
                    if (/ниже базового/i.test(cellStr)) belowCol = idx;
                    else if (/^\s*базовый\s*$/i.test(cellStr)) basicCol = idx;
                    else if (/повышенный/i.test(cellStr)) advancedCol = idx;
                    else if (/высокий/i.test(cellStr)) highCol = idx;
                });
                
                console.log(`MckoClassParser: уровни в строке ${i}, ниже=${belowCol}, баз=${basicCol}, повыш=${advancedCol}, высок=${highCol}`);
                break;
            }
        }

        // ===== ИСПРАВЛЕНО: если не нашли строку с уровнями, ищем по паттерну =====
        if (levelsRowIndex === -1) {
            for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, data.length); i++) {
                const row = data[i];
                if (!row) continue;
                
                // Проверяем, есть ли 4 числовых значения подряд (это уровни)
                let numbersCount = 0;
                let firstNumberIdx = -1;
                
                for (let j = 0; j < row.length; j++) {
                    const val = parseInt(row[j]);
                    if (!isNaN(val) && val >= 0 && val < 100) {
                        if (firstNumberIdx === -1) firstNumberIdx = j;
                        numbersCount++;
                    } else if (numbersCount > 0) {
                        break;
                    }
                }
                
                // Если нашли 4 числа подряд — это строка с уровнями
                if (numbersCount >= 4) {
                    levelsRowIndex = i;
                    belowCol = firstNumberIdx;
                    basicCol = firstNumberIdx + 1;
                    advancedCol = firstNumberIdx + 2;
                    highCol = firstNumberIdx + 3;
                    console.log(`MckoClassParser: уровни найдены по числам в строке ${i}`);
                    break;
                }
            }
        }

        let dataStartRow = headerRowIndex + 1;
        if (levelsRowIndex !== -1) {
            dataStartRow = levelsRowIndex + 1;
        }

        console.log(`MckoClassParser: начало данных со строки ${dataStartRow}, qualityCol=${qualityCol}`);

        // Парсим данные
        for (let i = dataStartRow; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[classCol]) continue;

            const className = String(row[classCol]).trim();
            let teacherName = teacherCol !== -1 ? String(row[teacherCol] || '').trim() : '';
            
            // Пропускаем служебные строки
            if (/всего|итого|ниже базового|базовый|повышенный|высокий/i.test(className)) continue;
            if (!teacherName || teacherName.length < 3) continue;
            
            const classMatch = className.match(/^(\d{1,2})\s*([А-ЯA-Z])$/i);
            if (!classMatch) {
                // Проверяем, не началась ли вторая таблица
                if (/^\d{1,2}[А-Я]$/i.test(className.replace(/\s/g, '')) && i > dataStartRow + 5) {
                    console.log(`MckoClassParser: вторая таблица на строке ${i}, останавливаемся`);
                    break;
                }
                continue;
            }

            let belowCount = 0, basicCount = 0, advancedCount = 0, highCount = 0;
            
            // Считываем уровни по найденным колонкам
            if (belowCol !== -1 && row[belowCol] !== undefined) {
                const val = parseInt(row[belowCol]);
                if (!isNaN(val)) belowCount = val;
            }
            if (basicCol !== -1 && row[basicCol] !== undefined) {
                const val = parseInt(row[basicCol]);
                if (!isNaN(val)) basicCount = val;
            }
            if (advancedCol !== -1 && row[advancedCol] !== undefined) {
                const val = parseInt(row[advancedCol]);
                if (!isNaN(val)) advancedCount = val;
            }
            if (highCol !== -1 && row[highCol] !== undefined) {
                const val = parseInt(row[highCol]);
                if (!isNaN(val)) highCount = val;
            }

            // Fallback: ищем числа в строке если колонки не определились
            if (belowCount === 0 && basicCount === 0 && advancedCount === 0 && highCount === 0) {
                const numbers = [];
                for (let j = classCol + 1; j < row.length; j++) {
                    const val = parseInt(row[j]);
                    if (!isNaN(val) && val >= 0 && val < 1000) {
                        numbers.push(val);
                    }
                }
                if (numbers.length >= 4) {
                    belowCount = numbers[0];
                    basicCount = numbers[1];
                    advancedCount = numbers[2];
                    highCount = numbers[3];
                }
            }
            
            // Считаем общее количество
            let totalStudents = countCol !== -1 ? (parseInt(row[countCol]) || 0) : 0;
            if (totalStudents === 0) {
                totalStudents = belowCount + basicCount + advancedCount + highCount;
            }
            
            // ===== ИСПРАВЛЕНО: парсим процент качества =====
            let qualityPercent = 0;
            
            // Вариант 1: из колонки "Качество"
            if (qualityCol !== -1 && row[qualityCol] !== undefined) {
                const rawValue = row[qualityCol];
                // Может быть числом или строкой с %
                if (typeof rawValue === 'number') {
                    qualityPercent = rawValue;
                } else {
                    const val = String(rawValue).replace('%', '').replace(',', '.').trim();
                    qualityPercent = parseFloat(val) || 0;
                }
                console.log(`MckoClassParser: качество для ${className} = ${qualityPercent}% (из колонки ${qualityCol})`);
            }
            
            // Вариант 2: считаем сами если не нашли или некорректно
            if ((qualityPercent === 0 || isNaN(qualityPercent)) && totalStudents > 0) {
                qualityPercent = Math.round(((advancedCount + highCount) / totalStudents) * 100);
                console.log(`MckoClassParser: качество для ${className} = ${qualityPercent}% (рассчитано)`);
            }

            console.log(`${className}: ${teacherName}, Всего=${totalStudents}, Кач=${qualityPercent}%`);

            const teachers = this.splitTeachers(teacherName);

            teachers.forEach(teacher => {
                results.push({
                    full_name: teacher,
                    subject: subject || 'Общий',
                    class_name: className,
                    total_students: totalStudents,
                    quality_percent: qualityPercent,
                    below_basic_count: belowCount,
                    basic_count: basicCount,
                    advanced_count: advancedCount,
                    high_count: highCount,
                    diagnostic_date: this.extractDateFromFilename(fileName) || new Date().toISOString().split('T')[0],
                    academic_year: academicYear
                });
            });
        }

        console.log(`MckoClassParser: обработано ${results.length} записей`);
        return results;
    }

    splitTeachers(teacherStr) {
        if (!teacherStr) return [];
        const separators = /[\/,]|\s+и\s+|&/;
        const parts = teacherStr.split(separators).map(t => t.trim()).filter(t => t.length > 2);
        if (parts.length === 0) return [teacherStr];
        return parts;
    }

    extractSubjectFromFilename(filename) {
        if (!filename) return null;
        const lower = filename.toLowerCase();
        
        const subjects = {
            'Математика': ['математика', 'математик', 'матем', 'алгебра', 'геометрия'],
            'Русский язык': ['русский', 'рус.яз', 'рус яз'],
            'Английский язык': ['английский', 'англ', 'англ.яз', 'иностранный'],
            'Физика': ['физика', 'физик'],
            'Химия': ['химия', 'химии'],
            'Биология': ['биология', 'биологии', 'биол'],
            'История': ['история', 'истории', 'истор'],
            'Обществознание': ['обществознание', 'общество', 'обществозн'],
            'География': ['география', 'географии', 'геогр'],
            'Информатика': ['информатика', 'информатике', 'инф', 'программирование'],
            'Литература': ['литература', 'литературе', 'лит'],
            'Физкультура': ['физкультура', 'физкультуре', 'физра', 'фк', 'физическая культура'],
            'ОБЖ': ['обж', 'безопасность'],
            'Технология': ['технология', 'технологии'],
            'ИЗО': ['изо', 'изобразительное', 'рисование'],
            'Музыка': ['музыка', 'музыке'],
        };
        
        for (const [subject, keywords] of Object.entries(subjects)) {
            if (keywords.some(k => lower.includes(k))) {
                console.log(`extractSubjectFromFilename: найден предмет "${subject}"`);
                return subject;
            }
        }
        
        return null;
    }

    extractDateFromFilename(filename) {
        if (!filename) return null;
        
        const patterns = [
            /(\d{2})[._](\d{2})[._](\d{4})/,
            /(\d{4})-(\d{2})-(\d{2})/
        ];
        
        for (const pattern of patterns) {
            const match = filename.match(pattern);
            if (match) {
                if (match[0].includes('-') && match[1].length === 4) {
                    return match[0];
                } else {
                    return `${match[3]}-${match[2]}-${match[1]}`;
                }
            }
        }
        return null;
    }
}

module.exports = new MckoClassParser();