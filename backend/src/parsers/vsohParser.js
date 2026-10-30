const XLSX = require('xlsx');

class VsohParser {
    // ===== ИСПРАВЛЕНО: добавлен originalName =====
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        
        // Ищем лист "Сводный" или первый
        const sheetName = workbook.SheetNames.find(n => /сводн/i.test(n)) || workbook.SheetNames[0];
        
        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`VsohParser: анализ листа "${sheetName}"${originalName ? ` (файл: ${originalName})` : ''}`);
        
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        const results = [];
        
        // Проверяем минимальное количество строк
        if (data.length < 3) {
            throw new Error('Файл слишком мал или пуст');
        }

        // Строка 0: названия этапов (вcош | школьный этап | муниципальный этап...)
        // Строка 1: подзаголовки (учитель | предмет | общее количество | призеры | победители...)
        // Строка 2+: данные
        
        const row0 = data[0] || [];
        const row1 = data[1] || [];
        
        // Определяем колонки учителя и предмета из строки 1
        let teacherCol = -1;
        let subjectCol = -1;
        
        row1.forEach((cell, idx) => {
            const cellStr = String(cell || '').toLowerCase();
            if (/учитель/i.test(cellStr)) teacherCol = idx;
            else if (/предмет/i.test(cellStr)) subjectCol = idx;
        });
        
        // Если не нашли в строке 1, ищем в строке 0
        if (teacherCol === -1) {
            row0.forEach((cell, idx) => {
                if (/учитель/i.test(String(cell || ''))) teacherCol = idx;
            });
        }
        if (subjectCol === -1) {
            row0.forEach((cell, idx) => {
                if (/предмет/i.test(String(cell || ''))) subjectCol = idx;
            });
        }

        if (teacherCol === -1) {
            throw new Error('Не найдена колонка "Учитель"');
        }

        // Определяем этапы из строки 0
        // Каждый этап занимает 3 колонки: общее количество, призеры, победители
        const stages = [];
        const stageNames = ['Школьный', 'Муниципальный', 'Региональный', 'Заключительный'];
        
        row0.forEach((cell, idx) => {
            const cellStr = String(cell || '').toLowerCase();
            
            stageNames.forEach(stageName => {
                if (cellStr.includes(stageName.toLowerCase())) {
                    stages.push({
                        name: stageName,
                        startIdx: idx // Начальная колонка этапа
                    });
                }
            });
        });

        // Данные начинаются со строки 2
        const dataStartRow = 2;

        console.log(`VsohParser: данные с ${dataStartRow} строки`);
        console.log(`VsohParser: колонки: Учитель=${teacherCol}, Предмет=${subjectCol}`);
        console.log(`VsohParser: найдено этапов: ${stages.length} (${stages.map(s => s.name).join(', ')})`);

        for (let i = dataStartRow; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[teacherCol]) continue;

            const teacherName = String(row[teacherCol]).trim();
            const subject = subjectCol !== -1 ? String(row[subjectCol] || '').trim() : '';
            
            // Пропускаем пустые и итоговые строки
            if (!teacherName || teacherName.length < 3) continue;
            if (/всего|итого|вс\s*о\s*ш/i.test(teacherName.toLowerCase())) continue;

            console.log(`VsohParser: обработка ${teacherName}, предмет: ${subject}`);

            // Разделяем учителей (через / , или "и")
            const teachers = this.splitTeachers(teacherName);

            teachers.forEach(teacher => {
                // Для каждого этапа создаём запись если есть данные
                stages.forEach(stage => {
                    const totalCol = stage.startIdx;
                    const prizeCol = stage.startIdx + 1;
                    const winnersCol = stage.startIdx + 2;
                    
                    // Проверяем, что колонки существуют в строке
                    const total = totalCol < row.length ? (parseInt(row[totalCol]) || 0) : 0;
                    const prize = prizeCol < row.length ? (parseInt(row[prizeCol]) || 0) : 0;
                    const winners = winnersCol < row.length ? (parseInt(row[winnersCol]) || 0) : 0;

                    // Добавляем запись только если есть хоть какие-то данные
                    if (total > 0 || prize > 0 || winners > 0) {
                        results.push({
                            full_name: teacher,
                            olympiad_name: 'ВсОШ',
                            olympiad_type: 'ВсОШ', 
                            subject: subject,
                            stage: stage.name,
                            total_participants: total,
                            prize_winners_count: prize,
                            winners_count: winners,
                            academic_year: academicYear
                        });
                        console.log(`  ${stage.name}: участников=${total}, призеров=${prize}, победителей=${winners}`);
                    }
                });
            });
        }

        // ===== ИСПРАВЛЕНО: логирование с originalName =====
        console.log(`VsohParser: обработано ${results.length} записей${originalName ? ` в файле ${originalName}` : ''}`);
        
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
}

module.exports = new VsohParser();