const XLSX = require('xlsx');

class OtherParser {
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        
        console.log(`OtherParser: начало обработки листа "${sheetName}"${originalName ? ` (файл: ${originalName})` : ''}`);
        
        const sheet = workbook.Sheets[sheetName];
        
        // Получаем данные как массив массивов
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        console.log('OtherParser: первая строка:', rawData[0]);
        console.log('OtherParser: вторая строка:', rawData[1]);
        console.log('OtherParser: третья строка:', rawData[2]);
        
        if (rawData.length < 3) {
            console.log('OtherParser: недостаточно данных');
            return [];
        }
        
        // Ищем реальную строку заголовков (пропускаем пустые и дубли)
        let headerRowIndex = 0;
        let dataStartIndex = 1;
        
        for (let i = 0; i < Math.min(5, rawData.length); i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            const firstCell = row[0]?.toString().trim().toLowerCase();
            
            // Если первая ячейка похожа на заголовок ФИО
            if (firstCell === 'фио' || firstCell === 'учитель' || firstCell.includes('фио')) {
                headerRowIndex = i;
                // Ищем где начинаются данные (пропускаем дубли заголовков)
                for (let j = i + 1; j < Math.min(i + 5, rawData.length); j++) {
                    const nextRow = rawData[j];
                    if (!nextRow || nextRow.length === 0) continue;
                    const nextFirstCell = nextRow[0]?.toString().trim();
                    // Если первая ячейка не похожа на заголовок — это данные
                    if (nextFirstCell && nextFirstCell.toLowerCase() !== 'фио' && !nextFirstCell.includes('Название')) {
                        dataStartIndex = j;
                        break;
                    }
                }
                break;
            }
        }
        
        const headers = rawData[headerRowIndex].map(h => h?.toString().trim().toLowerCase() || '');
        console.log('OtherParser: заголовки найдены в строке', headerRowIndex, ':', headers);
        console.log('OtherParser: данные начинаются со строки', dataStartIndex);
        
        // Ищем индексы колонок
        const fioIndex = this.findColumnIndex(headers, ['фио', 'учитель', 'педагог']);
        const eventIndex = this.findColumnIndex(headers, ['название мероприятия', 'мероприятие', 'название', 'событие', 'конкурс']);
        const statusIndex = this.findColumnIndex(headers, ['статус', 'результат', 'место']);
        const participantsIndex = this.findColumnIndex(headers, ['количество участников', 'участники', 'кол-во', 'количество', 'участников']);
        
        console.log('OtherParser: индексы:', { fio: fioIndex, event: eventIndex, status: statusIndex, participants: participantsIndex });
        
        if (fioIndex === -1 || eventIndex === -1) {
            console.error('OtherParser: не найдены обязательные колонки (ФИО или Название)');
            return [];
        }
        
        const documents = [];
        
        // Парсим данные
        for (let i = dataStartIndex; i < rawData.length; i++) {
            const row = rawData[i];
            if (!row || row.length === 0) continue;
            
            const fio = row[fioIndex];
            const event = row[eventIndex];
            
            // Пропускаем если пусто или это снова заголовок
            if (!fio || !event) continue;
            const fioStr = fio.toString().trim();
            const eventStr = event.toString().trim();
            if (fioStr.toLowerCase() === 'фио' || eventStr.toLowerCase().includes('название')) continue;
            
            const status = statusIndex !== -1 ? row[statusIndex] : null;
            const participants = participantsIndex !== -1 ? row[participantsIndex] : 0;
            
            documents.push({
                full_name: fioStr,
                event_name: eventStr,
                status: status ? status.toString().trim() : null,
                participants_count: parseInt(participants) || 0,
                event_date: null,      // Нет в файле
                event_level: null,     // Нет в файле
                role: null,            // Нет в файле
                academic_year: academicYear
            });
        }
        
        console.log(`OtherParser: распарсено ${documents.length} записей${originalName ? ` в файле ${originalName}` : ''}`);
        
        return documents;
    }
    
    findColumnIndex(headers, possibleNames) {
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i];
            for (const name of possibleNames) {
                if (header.includes(name.toLowerCase())) {
                    return i;
                }
            }
        }
        return -1;
    }
}

module.exports = new OtherParser();