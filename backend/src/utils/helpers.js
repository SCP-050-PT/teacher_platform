/**
 * Нормализация имени для ОТОБРАЖЕНИЯ (форматирование)
 * НЕ используется для сравнения - для сравнения используйте teacherService.normalizeForComparison
 */
function normalizeName(name) {
    if (!name) return '';
    
    // Убираем лишние пробелы
    let normalized = name.trim().replace(/\s+/g, ' ');
    
    // Приводим к формату "Фамилия И.О." если это полное ФИО
    const parts = normalized.split(' ');
    if (parts.length >= 3) {
        // Фамилия Имя Отчество [дополнительные части] → Фамилия И.О.
        const [last, first, middle, ...rest] = parts;
        // Поддержка двойных фамилий (Иванов-Петров Иван Иванович)
        const lastName = rest.length > 0 ? `${last} ${rest.join(' ')}` : last;
        normalized = `${lastName} ${first.charAt(0)}.${middle.charAt(0)}.`;
    } else if (parts.length === 2) {
        // Фамилия Имя → Фамилия И.
        const [last, first] = parts;
        normalized = `${last} ${first.charAt(0)}.`;
    }
    
    return normalized;
}

function parseFioParts(fullName) {
    if (!fullName || typeof fullName !== 'string') {
        return { lastName: '', firstName: '', middleName: '' };
    }
    
    const parts = fullName.trim().replace(/\s+/g, ' ').split(' ');
    return {
        lastName: parts[0] || '',
        firstName: parts[1] || '',
        middleName: parts[2] || ''
    };
}

function excelDateToJSDate(excelDate) {
    if (!excelDate) return null;
    
    // Если уже строка в формате ДД.ММ.ГГГГ или ДД/ММ/ГГГГ
    if (typeof excelDate === 'string') {
        const parts = excelDate.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
        if (parts) {
            const [, day, month, year] = parts;
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) return date;
        }
        return null;
    }
    
    // Если уже Date объект
    if (excelDate instanceof Date) {
        return isNaN(excelDate.getTime()) ? null : excelDate;
    }
    
    // Если число (стандартный Excel формат)
    if (typeof excelDate === 'number') {
        // Excel хранит даты как количество дней с 1 января 1900
        // (с поправкой на баг Excel с 29 февраля 1900)
        const epoch = new Date(1899, 11, 30);
        const jsDate = new Date(epoch.getTime() + excelDate * 24 * 60 * 60 * 1000);
        return isNaN(jsDate.getTime()) ? null : jsDate;
    }
    
    return null;
}

module.exports = {
    normalizeName,
    parseFioParts,
    excelDateToJSDate
};