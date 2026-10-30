const XLSX = require('xlsx');

class CoursesParser {
    // ===== ИСПРАВЛЕНО: добавлен originalName (даже если не используется) =====
    parse(buffer, academicYear = '2025/2026', originalName) {
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet);
        
        const courses = [];
        
        data.forEach(row => {
            const fio = row['ФИО'] || row['Учитель'];
            const code = row['Шифр курса'] || row['Шифр'];
            const name = row['Наименование курса'] || row['Курс'] || row['Название курса'];
            const org = row['Организация'] || row['Учреждение'];
            const date = row['Дата окончания'] || row['Дата'];
            const hours = row['Часы'] || row['Количество часов'] || 0;
            
            if (fio && name) {
                courses.push({
                    full_name: fio.toString().trim(),
                    course_code: code ? code.toString() : null,
                    course_name: name.toString(),
                    organization: org ? org.toString() : null,
                    completion_date: this.convertDate(date),
                    hours: parseInt(hours) || 0,
                    academic_year: academicYear
                });
            }
        });
        
        return courses;
    }
    
    convertDate(dateValue) {
        if (!dateValue) return null;
        
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        
        if (typeof dateValue === 'number') {
            const date = new Date((dateValue - 25569) * 86400 * 1000);
            if (isNaN(date.getTime())) return null;
            return date.toISOString().split('T')[0];
        }
        
        if (typeof dateValue === 'string') {
            const parts = dateValue.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
            if (parts) {
                const [, day, month, year] = parts;
                return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
        }
        
        return null;
    }
}

module.exports = new CoursesParser();