const db = require('../config/database');

class TeacherService {
    // ==================== Существующие методы ====================

    async createTeacherWithSubjects(fullName, subjects) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const { rows } = await client.query(
                'INSERT INTO teachers (full_name) VALUES ($1) RETURNING *',
                [fullName.trim()]
            );
            const teacher = rows[0];

            if (subjects && subjects.length > 0) {
                await this.updateTeacherSubjects(teacher.id, subjects, client);
            }

            await client.query('COMMIT');
            return teacher;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateTeacherWithSubjects(id, fullName, subjects) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            const { rows } = await client.query(
                'UPDATE teachers SET full_name = $1 WHERE id = $2 RETURNING *',
                [fullName.trim(), id]
            );

            if (rows.length === 0) {
                throw new Error('Teacher not found');
            }

            await client.query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [id]);
            if (subjects && subjects.length > 0) {
                await this.updateTeacherSubjects(id, subjects, client);
            }

            await client.query('COMMIT');
            return rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async updateTeacherSubjects(teacherId, subjects, client = null) {
        const shouldRelease = !client;
        client = client || await db.pool.connect();

        try {
            if (shouldRelease) await client.query('BEGIN');

            for (const subjectName of subjects) {
                let { rows: subjectRows } = await client.query(
                    'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1)',
                    [subjectName.trim()]
                );

                let subjectId;
                if (subjectRows.length === 0) {
                    const { rows: newSubject } = await client.query(
                        'INSERT INTO subjects (name) VALUES ($1) RETURNING id',
                        [subjectName.trim()]
                    );
                    subjectId = newSubject[0].id;
                } else {
                    subjectId = subjectRows[0].id;
                }

                await client.query(
                    `INSERT INTO teacher_subjects (teacher_id, subject_id)
                     VALUES ($1, $2)
                     ON CONFLICT DO NOTHING`,
                    [teacherId, subjectId]
                );
            }

            if (shouldRelease) await client.query('COMMIT');
        } catch (error) {
            if (shouldRelease) await client.query('ROLLBACK');
            throw error;
        } finally {
            if (shouldRelease) client.release();
        }
    }

    // ==================== НОВЫЕ МЕТОДЫ для parserService ====================

    /**
     * Найти учителя по имени (только поиск)
     * @param {string} fullName - ФИО для поиска
     * @param {object} client - опционально клиент для транзакции
     */
    async findTeacherByName(fullName, client = null) {
        const queryFn = client ? client.query.bind(client) : db.query;
        const normalizedInput = this.normalizeForComparison(fullName);

        // Получаем всех учителей (с ограничением для производительности)
        const { rows } = await queryFn(
            `SELECT t.*, 
                COALESCE(
                    array_agg(s.name) FILTER (WHERE s.name IS NOT NULL),
                    ARRAY[]::varchar[]
                ) as subjects
         FROM teachers t
         LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
         LEFT JOIN subjects s ON ts.subject_id = s.id
         GROUP BY t.id
         LIMIT 10000`
        );

        // Ищем совпадение по нормализованному имени
        for (const teacher of rows) {
            const normalizedExisting = this.normalizeForComparison(teacher.full_name);

            // Полное совпадение нормализованных имен
            if (normalizedInput === normalizedExisting) {
                return teacher;
            }

            // Проверка по фамилии и инициалам (только если оба имеют формат с инициалами)
            const inputParts = normalizedInput.split(' ').filter(p => p);
            const existingParts = normalizedExisting.split(' ').filter(p => p);

            if (inputParts.length >= 2 && existingParts.length >= 2) {
                // Фамилии совпадают
                if (inputParts[0] === existingParts[0]) {
                    // Инициал имени совпадает (первая буква)
                    if (inputParts[1].charAt(0) === existingParts[1].charAt(0)) {
                        // Если есть отчество - проверяем и его инициал
                        if (inputParts.length >= 3 && existingParts.length >= 3) {
                            if (inputParts[2].charAt(0) === existingParts[2].charAt(0)) {
                                return teacher;
                            }
                        } else {
                            return teacher;
                        }
                    }
                }
            }
        }

        return null;
    }

    /**
     * Найти или создать учителя
     * @param {string} fullName - ФИО учителя
     * @param {array} subjects - массив предметов (опционально)
     * @returns {object} { id, isNew, full_name }
     */
    async findOrCreate(fullName, subjects = []) {
        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // Ищем существующего через findTeacherByName с клиентом транзакции
            const existing = await this.findTeacherByName(fullName, client);

            if (existing) {
                if (subjects && subjects.length > 0) {
                    await this.updateTeacherSubjects(existing.id, subjects, client);
                }

                await client.query('COMMIT');
                return {
                    id: existing.id,
                    isNew: false,
                    full_name: existing.full_name
                };
            }

            // Создаем нового
            const { rows: newTeacher } = await client.query(
                'INSERT INTO teachers (full_name) VALUES ($1) RETURNING id, full_name',
                [fullName.trim()]
            );

            const teacherId = newTeacher[0].id;

            if (subjects && subjects.length > 0) {
                await this.updateTeacherSubjects(teacherId, subjects, client);
            }

            await client.query('COMMIT');
            return {
                id: teacherId,
                isNew: true,
                full_name: newTeacher[0].full_name
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Нормализовать имя для сравнения
     */
    normalizeForComparison(name) {
        if (!name) return '';

        return name
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')           // Убираем лишние пробелы
            .replace(/[.,]/g, '')            // Убираем точки и запятые
            .replace(/[ё]/g, 'е')            // Ё → Е
            .replace(/[ъь]\b/g, '')          // Убираем твёрдый/мягкий знак ТОЛЬКО в конце слова
            .replace(/\s+/g, ' ');
    }

    /**
     * Найти или создать учителя (альтернативное имя для совместимости)
     */
    async findOrCreateTeacher(fullName, client = null) {
        if (client) {
            // Если передан клиент, используем findOrCreate без вложенной транзакции
            const existing = await this.findTeacherByName(fullName, client);
            if (existing) {
                return { id: existing.id, isNew: false };
            }
            
            const { rows } = await client.query(
                'INSERT INTO teachers (full_name) VALUES ($1) RETURNING id',
                [fullName.trim()]
            );
            return { id: rows[0].id, isNew: true };
        }
        
        const result = await this.findOrCreate(fullName, []);
        return { id: result.id, isNew: result.isNew };
    }
}

module.exports = new TeacherService();