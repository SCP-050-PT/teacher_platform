const XLSX = require('xlsx');

class FileIdentifier { 
    identify(buffer, originalName = '') {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetNames = workbook.SheetNames;
        const firstSheet = workbook.Sheets[sheetNames[0]];
        const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (data.length === 0) return 'unknown';

        let headerRows = [];
        let allText = '';

        for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i];
            if (row && row.length > 0) {
                const rowStr = row.map(c => String(c || '').toLowerCase().trim()).join(' ');
                headerRows.push(rowStr);
                allText += ' ' + rowStr;
            }
        }

        const sheetNamesStr = sheetNames.join(' ').toLowerCase();
        const normalizedText = allText.replace(/\s+/g, ' ').toLowerCase();
        const filenameLower = originalName.toLowerCase();

        console.log('=== FileIdentifier Debug ===');
        console.log('Sheet names:', sheetNames);
        console.log('Original name:', originalName);
        console.log('Header rows:', headerRows.slice(0, 5));

        // ========== 1. МЦКО УЧИТЕЛЕЙ ==========
        if ((normalizedText.includes('фио') || normalizedText.includes('учитель')) &&
            normalizedText.includes('достигнутый уровень') &&
            (normalizedText.includes('предмет') || normalizedText.includes('диагностика'))) {
            console.log('Detected: mcko_teacher');
            return 'mcko_teacher';
        }

        // ========== 2. МЦКО ПО КЛАССАМ ==========
        if (normalizedText.includes('класс') &&
            normalizedText.includes('качество') &&
            normalizedText.includes('учитель') &&
            (normalizedText.includes('ниже базового') ||
                normalizedText.includes('базовый') ||
                normalizedText.includes('повышенный') ||
                normalizedText.includes('высокий'))) {
            console.log('Detected: mcko_class');
            return 'mcko_class';
        }

        if ((sheetNamesStr.includes('сводный') || sheetNamesStr.includes('сводная')) &&
            normalizedText.includes('качество') &&
            normalizedText.includes('класс')) {
            console.log('Detected: mcko_class (by sheet name)');
            return 'mcko_class';
        }

        // ========== 3. ВСОШ ==========
        const hasVsohName = /в[сc]ош|вс[\s-]?ош|всероссийская/i.test(normalizedText + ' ' + sheetNamesStr);
        const hasStages = normalizedText.includes('школьный') &&
            (normalizedText.includes('муниципальный') || normalizedText.includes('региональный'));

        if (hasVsohName || (hasStages && normalizedText.includes('этап'))) {
            console.log('Detected: vsoh');
            return 'vsoh';
        }

        // ========== 4. МОШ ==========
        const hasParallel = sheetNamesStr.includes('параллель') ||
            /^\d+\s*параллель$/i.test(sheetNames[0] || '');
        const hasMoshKeywords = normalizedText.includes('московская олимпиада') ||
            normalizedText.includes('мош') ||
            sheetNamesStr.includes('мош');

        if ((hasParallel || hasMoshKeywords) &&
            normalizedText.includes('фио') &&
            normalizedText.includes('класс')) {
            console.log('Detected: olympiad (МОШ)');
            return 'olympiad';
        }

        // ========== 5. ОГЭ / ЕГЭ ==========
        const hasTeacherStats = sheetNamesStr.includes('статистика по учителям') ||
            normalizedText.includes('статистика по учителям') ||
            normalizedText.includes('статистика');
        const hasFio = normalizedText.includes('фио');
        const hasSubjects = /математика|русский|английский|физика|химия|биология|история|обществознание|география|информатика|литература/i.test(normalizedText);
        const hasEgeInFilename = /егэ|ege/i.test(filenameLower);
        const hasOgeInFilename = /огэ|oge/i.test(filenameLower);

        if ((hasTeacherStats || hasFio) && (hasSubjects || hasEgeInFilename || hasOgeInFilename)) {

            // Приоритет 1: по названию файла
            if (hasEgeInFilename && !hasOgeInFilename) {
                console.log('Detected: exam_ege (by filename)');
                return 'exam_ege';
            }
            if (hasOgeInFilename && !hasEgeInFilename) {
                console.log('Detected: exam_oge (by filename)');
                return 'exam_oge';
            }

            // Приоритет 2: по ключевым словам в содержимом
            const hasEgeKeyword = /\bегэ\b|\bege\b|единый государственный/i.test(normalizedText);
            const hasOgeKeyword = /\bогэ\b|\boge\b|основной государственный/i.test(normalizedText);

            if (hasEgeKeyword && !hasOgeKeyword) {
                console.log('Detected: exam_ege (by keyword)');
                return 'exam_ege';
            }
            if (hasOgeKeyword && !hasEgeKeyword) {
                console.log('Detected: exam_oge (by keyword)');
                return 'exam_oge';
            }

            // Приоритет 3: по структуре таблицы
            // ЕГЭ: пороги с "<" или диапазонами баллов
            const hasEgeThresholds = /<\s*\d+|не\s+набрали|ниже\s+минимального|0\s*-\s*59|60\s*-\s*79|80\s*-\s*100/i.test(normalizedText);

            // ОГЭ: оценки 2,3,4,5 в заголовках
            let hasOgeGrades = false;
            for (const row of headerRows) {
                if ((/\b2\b.*\b3\b.*\b4\b.*\b5\b/).test(row) || /неуд|удовл|хор|отл/i.test(row)) {
                    hasOgeGrades = true;
                    break;
                }
            }

            if (hasEgeThresholds && !hasOgeGrades) {
                console.log('Detected: exam_ege (by structure)');
                return 'exam_ege';
            }
            if (hasOgeGrades && !hasEgeThresholds) {
                console.log('Detected: exam_oge (by structure)');
                return 'exam_oge';
            }

            // Fallback: если не определились — смотрим на ключевые слова ещё раз
            if (hasEgeKeyword || hasEgeThresholds || hasEgeInFilename) {
                console.log('Detected: exam_ege (fallback)');
                return 'exam_ege';
            }
            if (hasOgeKeyword || hasOgeGrades || hasOgeInFilename) {
                console.log('Detected: exam_oge (fallback)');
                return 'exam_oge';
            }
        }
        // ========== 6. КУРСЫ ==========
        if (normalizedText.includes('шифр') &&
            normalizedText.includes('курс') &&
            (normalizedText.includes('организация') || normalizedText.includes('повышени'))) {
            console.log('Detected: courses');
            return 'courses';
        }

        // ========== 7. ИНЫЕ МЕРОПРИЯТИЯ ==========
        const hasEventName = normalizedText.includes('название мероприятия') ||
            normalizedText.includes('наименование мероприятия') ||
            normalizedText.includes('мероприятие');
        const hasEventResult = normalizedText.includes('статус') ||
            normalizedText.includes('результат') ||
            normalizedText.includes('уровень') ||
            normalizedText.includes('место') ||
            normalizedText.includes('диплом');

        if (hasFio && hasEventName && hasEventResult) {
            console.log('Detected: other (strict match)');
            return 'other';
        }

        if (hasFio && normalizedText.includes('мероприятие')) {
            console.log('Detected: other (fio + event)');
            return 'other';
        }

        if (normalizedText.includes('иное') ||
            normalizedText.includes('конкурс') ||
            normalizedText.includes('выставка') ||
            normalizedText.includes('фестиваль')) {
            console.log('Detected: other (by keyword)');
            return 'other';
        }

        // ========== Fallback ==========
        if (normalizedText.includes('мцко') || normalizedText.includes('диагностика')) {
            if (normalizedText.includes('достигнутый уровень') ||
                normalizedText.includes('экспертный')) {
                console.log('Detected: mcko_teacher (fallback)');
                return 'mcko_teacher';
            }
            if (normalizedText.includes('10') || normalizedText.includes('качество')) {
                console.log('Detected: mcko_class (fallback)');
                return 'mcko_class';
            }
        }

        console.log('Detected: unknown');
        return 'unknown';
    }
}

module.exports = new FileIdentifier();