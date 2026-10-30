const db = require('../config/database');
const teacherService = require('../services/teacherService');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

// ==================== CRUD с транзакциями ====================

const create = async (req, res) => {
    try {
        const { full_name, subjects } = req.body;

        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ error: 'ФИО обязательно (минимум 2 символа)' });
        }

        const teacher = await teacherService.createTeacherWithSubjects(
            full_name,
            subjects || []
        );

        res.status(201).json(teacher);
    } catch (error) {
        console.error('Ошибка создания учителя:', error);
        res.status(500).json({ error: 'Ошибка создания учителя' });
    }
};

const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, subjects } = req.body;

        if (!full_name || full_name.trim().length < 2) {
            return res.status(400).json({ error: 'ФИО обязательно' });
        }

        const teacher = await teacherService.updateTeacherWithSubjects(
            parseInt(id),
            full_name,
            subjects
        );

        res.json(teacher);
    } catch (error) {
        if (error.message === 'Teacher not found') {
            return res.status(404).json({ error: 'Учитель не найден' });
        }
        console.error('Ошибка обновления учителя:', error);
        res.status(500).json({ error: 'Ошибка обновления учителя' });
    }
};

const remove = async (req, res) => {
    const client = await db.pool.connect();

    try {
        const { id } = req.params;

        await client.query('BEGIN');

        const { rows, rowCount } = await client.query(
            'SELECT id FROM teachers WHERE id = $1 FOR UPDATE',
            [parseInt(id)]
        );

        if (rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Учитель не найден' });
        }

        await client.query('DELETE FROM teacher_subjects WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM courses WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM diagnostics WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM mcko_teacher_diagnostics WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM olympiads WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM exam_results_oge WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM exam_results_ege WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM other_documents WHERE teacher_id = $1', [id]);
        await client.query('DELETE FROM teachers WHERE id = $1', [id]);

        await client.query('COMMIT');

        res.json({ message: 'Учитель удалён', id: parseInt(id) });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Ошибка удаления учителя:', error);
        res.status(500).json({ error: 'Ошибка удаления учителя' });
    } finally {
        client.release();
    }
};

// ==================== GET методы ====================

const getAll = async (req, res) => {
    try {
        const { search, subject, page = 1, limit = 20 } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        if (search) {
            whereClause += ` AND LOWER(t.full_name) LIKE $${paramIndex}`;
            params.push(`%${search.toLowerCase().trim()}%`);
            paramIndex++;
        }

        if (subject) {
            whereClause += ` AND EXISTS (
                SELECT 1 FROM teacher_subjects ts2 
                JOIN subjects s2 ON ts2.subject_id = s2.id 
                WHERE ts2.teacher_id = t.id AND s2.name = $${paramIndex}
            )`;
            params.push(subject);
            paramIndex++;
        }

        const offset = (parseInt(page) - 1) * parseInt(limit);
        params.push(parseInt(limit), offset);

        const { rows: teachers } = await db.query(
            `SELECT t.id, t.full_name, t.created_at,
                    COALESCE(
                        array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
                        ARRAY[]::varchar[]
                    ) as subjects,
                    COUNT(DISTINCT c.id) as courses_count,
                    COUNT(DISTINCT d.id) + COUNT(DISTINCT mtd.id) as diagnostics_count,
                    COUNT(DISTINCT o.id) as olympiads_count
             FROM teachers t
             LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
             LEFT JOIN subjects s ON ts.subject_id = s.id
             LEFT JOIN courses c ON t.id = c.teacher_id
             LEFT JOIN diagnostics d ON t.id = d.teacher_id
             LEFT JOIN mcko_teacher_diagnostics mtd ON t.id = mtd.teacher_id
             LEFT JOIN olympiads o ON t.id = o.teacher_id
             ${whereClause}
             GROUP BY t.id
             ORDER BY t.full_name
             LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
            params
        );

        const { rows: countRows } = await db.query(
            `SELECT COUNT(DISTINCT t.id) as total FROM teachers t
             LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
             LEFT JOIN subjects s ON ts.subject_id = s.id
             ${whereClause}`,
            params.slice(0, -2)
        );

        res.json({
            data: teachers,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: parseInt(countRows[0].total),
                totalPages: Math.ceil(countRows[0].total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Ошибка получения учителей:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

const getById = async (req, res) => {
    try {
        const { id } = req.params;

        const { rows: teachers } = await db.query(
            `SELECT t.id, t.full_name, t.created_at,
                    COALESCE(
                        array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL),
                        ARRAY[]::varchar[]
                    ) as subjects
             FROM teachers t
             LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
             LEFT JOIN subjects s ON ts.subject_id = s.id
             WHERE t.id = $1
             GROUP BY t.id`,
            [parseInt(id)]
        );

        if (teachers.length === 0) {
            return res.status(404).json({ error: 'Учитель не найден' });
        }

        const teacher = teachers[0];

        const [
            courses,
            diagnostics,
            mckoTeacherDiags,
            olympiads,
            examResultsOge,
            examResultsEge,
            otherDocs
        ] = await Promise.all([
            db.query('SELECT * FROM courses WHERE teacher_id = $1 ORDER BY completion_date DESC', [id]),
            db.query('SELECT * FROM diagnostics WHERE teacher_id = $1 ORDER BY diagnostic_date DESC', [id]),
            db.query('SELECT * FROM mcko_teacher_diagnostics WHERE teacher_id = $1 ORDER BY diagnostic_date DESC', [id]),
            db.query('SELECT * FROM olympiads WHERE teacher_id = $1 ORDER BY created_at DESC', [id]),
            db.query('SELECT * FROM exam_results_oge WHERE teacher_id = $1 ORDER BY academic_year DESC', [id]),
            db.query('SELECT * FROM exam_results_ege WHERE teacher_id = $1 ORDER BY academic_year DESC', [id]),
            db.query('SELECT * FROM other_documents WHERE teacher_id = $1 ORDER BY event_date DESC', [id])
        ]);

        teacher.courses = courses.rows;
        teacher.diagnostics = diagnostics.rows;
        teacher.mcko_teacher_diagnostics = mckoTeacherDiags.rows;
        teacher.olympiads = olympiads.rows;
        teacher.exam_results_oge = examResultsOge.rows;
        teacher.exam_results_ege = examResultsEge.rows;
        teacher.other_documents = otherDocs.rows;

        teacher.stats = {
            courses_count: courses.rows.length,
            diagnostics_count: diagnostics.rows.length + mckoTeacherDiags.rows.length,
            olympiads_count: olympiads.rows.length,
            exam_results_count: examResultsOge.rows.length + examResultsEge.rows.length,
            other_docs_count: otherDocs.rows.length
        };

        res.json(teacher);
    } catch (error) {
        console.error('Ошибка получения профиля:', error);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
};

// ==================== PDF генерация ====================

const generatePdf = async (req, res) => {
    try {
        const { id } = req.params;

        const teacher = await getTeacherDataForPdf(id);

        if (!teacher) {
            return res.status(404).json({ error: 'Учитель не найден' });
        }

        // === ЛОГИРОВАНИЕ ОЛИМПИАД ===
        console.log('=== PDF GENERATION ===');
        console.log('Teacher:', teacher.full_name);
        console.log('Всего олимпиад:', teacher.olympiads.length);
        teacher.olympiads.forEach((o, i) => {
            console.log(`[${i}] id=${o.id}, type="${o.olympiad_type}", subject="${o.subject}", stage="${o.stage}"`);
        });
        // ===========================

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        const dateStr = new Date().toISOString().split('T')[0];
        const safeName = teacher.full_name
            .replace(/[^\w\s-а-яА-ЯёЁ]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 50);

        const fileName = `Profile_${safeName}_${dateStr}.pdf`;
        const encodedFileName = encodeURIComponent(fileName);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodedFileName}`);

        doc.pipe(res);

        const colors = {
            light: '#f1f5f9',
            white: '#ffffff',
            border: '#cbd5e1',
            text: '#000000'
        };

        const fontPath = path.join(__dirname, '../fonts/Roboto-Regular.ttf');
        const fontBoldPath = path.join(__dirname, '../fonts/Roboto-Bold.ttf');

        if (fs.existsSync(fontPath)) {
            doc.registerFont('Roboto', fontPath);
            doc.registerFont('RobotoBold', fontBoldPath);
        } else {
            doc.registerFont('Roboto', 'Helvetica');
            doc.registerFont('RobotoBold', 'Helvetica-Bold');
        }

        // ===== ШАПКА =====
        doc.rect(0, 0, 612, 100).fill('#667eea');
        doc.fillColor(colors.text).font('Roboto').fontSize(10).text('МБОУ ШКОЛА №777', 50, 25);
        doc.font('RobotoBold').fontSize(20).text('ПРОФИЛЬ ПЕДАГОГА', 50, 50);
        doc.rect(50, 80, 80, 3).fill('#22c55e');

        let y = 120;

        doc.fillColor(colors.text).font('RobotoBold').fontSize(18).text(teacher.full_name, 50, y);
        y += 35;

        const subjects = teacher.subjects || [];
        let x = 50;
        subjects.forEach((subject, index) => {
            const badgeWidth = doc.widthOfString(subject) + 24;
            if (x + badgeWidth > 550 && index > 0) {
                x = 50;
                y += 32;
            }
            doc.roundedRect(x, y, badgeWidth, 26, 4).fill(colors.light).stroke(colors.border);
            doc.fillColor(colors.text).font('Roboto').fontSize(10).text(subject, x + 12, y + 7);
            x += badgeWidth + 8;
        });

        y += 45;
        doc.fillColor('#64748b').font('Roboto').fontSize(9).text(`Дата формирования: ${new Date().toLocaleDateString('ru-RU')}`, 50, y);
        y += 30;

        // ===== КУРСЫ =====
        if (teacher.courses.length > 0) {
            y += 10;
            const tableTop = y;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('КУРСЫ ПОВЫШЕНИЯ КВАЛИФИКАЦИИ', 60, tableTop + 8);
            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('КУРС', 60, y + 7, { width: 230 });
            doc.text('ОРГАНИЗАЦИЯ', 300, y + 7, { width: 160 });
            doc.text('ДАТА', 470, y + 7, { width: 50 });
            doc.text('ЧАСЫ', 525, y + 7, { width: 30 });
            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            teacher.courses.forEach((course, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const colWidths = { course: 230, org: 160, date: 50, hours: 30 };
                const colPositions = { course: 60, org: 300, date: 470, hours: 525 };
                const padding = 8;

                const courseHeight = doc.heightOfString(course.course_name || '-', {
                    width: colWidths.course,
                    lineGap: 2
                });
                const orgHeight = doc.heightOfString(course.organization || '-', {
                    width: colWidths.org,
                    lineGap: 2
                });

                const rowHeight = Math.max(28, Math.max(courseHeight, orgHeight) + padding * 2);

                if (index % 2 === 1) {
                    doc.rect(50, y, 512, rowHeight).fill('#f8fafc');
                }
                doc.rect(50, y, 512, rowHeight).stroke(colors.border);

                doc.text(course.course_name || '-', colPositions.course, y + padding, {
                    width: colWidths.course,
                    lineGap: 2,
                    height: rowHeight - padding * 2,
                    ellipsis: true
                });

                doc.text(course.organization || '-', colPositions.org, y + padding, {
                    width: colWidths.org,
                    lineGap: 2,
                    height: rowHeight - padding * 2,
                    ellipsis: true
                });

                const dateText = formatDate(course.completion_date);
                const dateHeight = doc.heightOfString(dateText, { width: colWidths.date });
                doc.text(dateText, colPositions.date, y + (rowHeight - dateHeight) / 2, {
                    width: colWidths.date,
                    align: 'center'
                });

                const hoursText = course.hours ? String(course.hours) : '-';
                const hoursHeight = doc.heightOfString(hoursText, { width: colWidths.hours });
                doc.text(hoursText, colPositions.hours, y + (rowHeight - hoursHeight) / 2, {
                    width: colWidths.hours,
                    align: 'center'
                });

                y += rowHeight;
            });

            y += 20;
        }

        // ===== ДИАГНОСТИКИ МЦКО (ЛИЧНЫЕ) =====
        if (teacher.mcko_teacher_diagnostics.length > 0) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }

            y += 10;
            const tableTop = y;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('ДИАГНОСТИКИ МЦКО (ЛИЧНЫЕ)', 60, tableTop + 8);
            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('ТИП ЭКЗАМЕНА', 60, y + 7, { width: 130 });
            doc.text('ПРЕДМЕТ', 200, y + 7, { width: 130 });
            doc.text('УРОВЕНЬ', 340, y + 7, { width: 100 });
            doc.text('ДАТА', 450, y + 7, { width: 80 });
            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            teacher.mcko_teacher_diagnostics.forEach((d, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const rowHeight = 28;
                const rowY = y;

                if (index % 2 === 1) {
                    doc.rect(50, rowY, 512, rowHeight).fill('#f8fafc');
                }
                doc.rect(50, rowY, 512, rowHeight).stroke(colors.border);

                doc.text(d.exam_type || 'Диагностика', 60, rowY + 8, { width: 130 });
                doc.text(d.subject || '-', 200, rowY + 8, { width: 130 });
                doc.text(d.level_achieved || '-', 340, rowY + 8, { width: 100 });
                doc.text(formatDate(d.diagnostic_date), 450, rowY + 8, { width: 80 });

                y += rowHeight;
            });

            y += 20;
        }

        // ===== ОГЭ =====
        if (teacher.exam_results_oge.length > 0) {
            teacher.exam_results_oge.forEach(exam => {
                if (y > 600) {
                    doc.addPage();
                    y = 50;
                }

                y += 10;
                const tableTop = y;
                const rowHeight = 28;

                doc.rect(50, tableTop, 512, 28).fill(colors.light);
                doc.fillColor(colors.text).font('RobotoBold').fontSize(11);
                doc.text('ОСНОВНОЙ ГОСУДАРСТВЕННЫЙ ЭКЗАМЕН (ОГЭ)', 60, tableTop + 8);

                y = tableTop + 28;

                doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
                doc.fillColor(colors.text).font('RobotoBold').fontSize(9);

                const colX = [60, 160, 220, 280, 340, 400, 460];
                const colW = [90, 50, 50, 50, 50, 50, 50];

                doc.text('ПРЕДМЕТ', colX[0], y + 7, { width: colW[0] });
                doc.text('ГОД', colX[1], y + 7, { width: colW[1] });
                doc.text('ВСЕГО', colX[2], y + 7, { width: colW[2] });
                doc.text('2', colX[3], y + 7, { width: colW[3], align: 'center' });
                doc.text('3', colX[4], y + 7, { width: colW[4], align: 'center' });
                doc.text('4', colX[5], y + 7, { width: colW[5], align: 'center' });
                doc.text('5', colX[6], y + 7, { width: colW[6], align: 'center' });

                y += 24;

                // СНАЧАЛА фон, потом граница, потом текст
                doc.rect(50, y, 512, rowHeight).fill('#f8fafc');
                doc.rect(50, y, 512, rowHeight).stroke(colors.border);

                // Текст — явно сбрасываем цвет!
                doc.fillColor(colors.text).font('Roboto').fontSize(9);

                const textY = y + 9;

                doc.font('RobotoBold').text(exam.subject || '-', colX[0], textY, { width: colW[0] });
                doc.font('Roboto').text(exam.academic_year || '-', colX[1], textY, { width: colW[1] });
                doc.font('RobotoBold').text(String(exam.total_students || 0), colX[2], textY, { width: colW[2] });

                doc.text(String(exam.grade_2_count || 0), colX[3], textY, { width: colW[3], align: 'center' });
                doc.text(String(exam.grade_3_count || 0), colX[4], textY, { width: colW[4], align: 'center' });
                doc.text(String(exam.grade_4_count || 0), colX[5], textY, { width: colW[5], align: 'center' });
                doc.text(String(exam.grade_5_count || 0), colX[6], textY, { width: colW[6], align: 'center' });

                y += rowHeight + 15;
            });
        }

        // ===== ЕГЭ =====
        if (teacher.exam_results_ege.length > 0) {
            teacher.exam_results_ege.forEach(exam => {
                if (y > 600) {
                    doc.addPage();
                    y = 50;
                }

                y += 10;
                const tableTop = y;
                const rowHeight = 28;

                doc.rect(50, tableTop, 512, 28).fill(colors.light);
                doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('ЕДИНЫЙ ГОСУДАРСТВЕННЫЙ ЭКЗАМЕН (ЕГЭ)', 60, tableTop + 8);

                y = tableTop + 28;

                doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
                doc.fillColor(colors.text).font('RobotoBold').fontSize(9);

                const colX = [60, 160, 220, 280, 340, 400, 460];
                const colW = [90, 50, 50, 50, 50, 50, 50];

                doc.text('ПРЕДМЕТ', colX[0], y + 7, { width: colW[0] });
                doc.text('ГОД', colX[1], y + 7, { width: colW[1] });
                doc.text('ВСЕГО', colX[2], y + 7, { width: colW[2] });
                doc.text('< мин', colX[3], y + 7, { width: colW[3], align: 'center' });
                doc.text('0-59', colX[4], y + 7, { width: colW[4], align: 'center' });
                doc.text('60-79', colX[5], y + 7, { width: colW[5], align: 'center' });
                doc.text('80-100', colX[6], y + 7, { width: colW[6], align: 'center' });

                y += 24;

                // СНАЧАЛА фон, потом граница, потом текст
                doc.rect(50, y, 512, rowHeight).fill('#f8fafc');
                doc.rect(50, y, 512, rowHeight).stroke(colors.border); // ← отдельно stroke!

                // Текст — явно сбрасываем цвет!
                doc.fillColor(colors.text).font('Roboto').fontSize(9);

                const textY = y + 9;

                doc.font('RobotoBold').text(exam.subject || '-', colX[0], textY, { width: colW[0] });
                doc.font('Roboto').text(exam.academic_year || '-', colX[1], textY, { width: colW[1] });
                doc.font('RobotoBold').text(String(exam.total_students || 0), colX[2], textY, { width: colW[2] });

                doc.text(String(exam.threshold_lt_count || 0), colX[3], textY, { width: colW[3], align: 'center' });
                doc.text(String(exam.threshold_0_59_count || 0), colX[4], textY, { width: colW[4], align: 'center' });
                doc.text(String(exam.threshold_60_79_count || 0), colX[5], textY, { width: colW[5], align: 'center' });
                doc.text(String(exam.threshold_80_100_count || 0), colX[6], textY, { width: colW[6], align: 'center' });

                y += rowHeight + 15;
            });
        }

        // ===== ВСОШ =====
        const allOlympiads = teacher.olympiads || [];
        const vsohResults = allOlympiads.filter(o => {
            const type = String(o.olympiad_type || '').trim();
            return type === 'ВсОШ';
        });

        if (vsohResults.length > 0) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }

            y += 10;
            const tableTop = y;
            const rowHeight = 28;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11)
                .text(`ВСЕРОССИЙСКАЯ ОЛИМПИАДА ШКОЛЬНИКОВ (ВСОШ)`, 60, tableTop + 8);

            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('ПРЕДМЕТ', 60, y + 7, { width: 120 });
            doc.text('ЭТАП', 190, y + 7, { width: 100 });
            doc.text('УЧАСТНИКИ', 300, y + 7, { width: 80 });
            doc.text('ПОБЕДИТЕЛИ', 390, y + 7, { width: 80 });
            doc.text('ПРИЗЁРЫ', 480, y + 7, { width: 70 });

            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            vsohResults.forEach((o, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const rowY = y;

                // СНАЧАЛА фон (если нужен), потом граница, потом текст
                if (index % 2 === 1) {
                    doc.rect(50, rowY, 512, rowHeight).fill('#f8fafc');
                }

                // Граница ВСЕГДА
                doc.rect(50, rowY, 512, rowHeight).stroke(colors.border);

                // Текст
                doc.fillColor(colors.text); // ← сбрасываем цвет!
                doc.text(o.subject || '-', 60, rowY + 8, { width: 120 });
                doc.text(o.stage || '-', 190, rowY + 8, { width: 100 });
                doc.text(String(o.total_participants || 0), 300, rowY + 8, { width: 80 });
                doc.text(String(o.winners_count || 0), 390, rowY + 8, { width: 80 });
                doc.text(String(o.prize_winners_count || 0), 480, rowY + 8, { width: 70 });

                y += rowHeight;
            });

            y += 20;
        }

        // ===== МОШ =====
        const moshResults = allOlympiads.filter(o => {
            const type = String(o.olympiad_type || '').trim();
            return type === 'МОШ';
        });

        if (moshResults.length > 0) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }

            y += 10;
            const tableTop = y;
            const rowHeight = 28;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('МОСКОВСКАЯ ОЛИМПИАДА ШКОЛЬНИКОВ (МОШ)', 60, tableTop + 8);

            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('ПРЕДМЕТ', 60, y + 7, { width: 120 });
            doc.text('ПАРАЛЛЕЛЬ', 190, y + 7, { width: 100 });
            doc.text('УЧАСТНИКИ', 300, y + 7, { width: 80 });
            doc.text('ПОБЕДИТЕЛИ', 390, y + 7, { width: 80 });
            doc.text('ПРИЗЁРЫ', 480, y + 7, { width: 70 });

            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            moshResults.forEach((o, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const rowY = y;

                if (index % 2 === 1) {
                    doc.rect(50, rowY, 512, rowHeight).fill('#f8fafc');
                }
                doc.rect(50, rowY, 512, rowHeight).stroke(colors.border);

                doc.text(o.subject || '-', 60, rowY + 8, { width: 120 });
                doc.text(o.parallel ? String(o.parallel) : '-', 190, rowY + 8, { width: 100 });
                doc.text(String(o.total_participants || 0), 300, rowY + 8, { width: 80 });
                doc.text(String(o.winners_count || 0), 390, rowY + 8, { width: 80 });
                doc.text(String(o.prize_winners_count || 0), 480, rowY + 8, { width: 70 });

                y += rowHeight;
            });

            y += 20;
        }

        // ===== МЦКО ПО КЛАССАМ =====
        if (teacher.diagnostics.length > 0) {
            if (y > 600) {
                doc.addPage();
                y = 50;
            }

            y += 10;
            const tableTop = y;
            const rowHeight = 28;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('МЦКО ПО КЛАССАМ', 60, tableTop + 8);

            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('ПРЕДМЕТ', 60, y + 7, { width: 100 });
            doc.text('КЛАСС', 170, y + 7, { width: 50 });
            doc.text('КАЧЕСТВО %', 230, y + 7, { width: 70 });
            doc.text('НИЖЕ БАЗ.', 310, y + 7, { width: 60 });
            doc.text('БАЗОВЫЙ', 380, y + 7, { width: 60 });
            doc.text('ПОВЫШ.', 450, y + 7, { width: 50 });
            doc.text('ВЫСОКИЙ', 510, y + 7, { width: 50 });

            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            teacher.diagnostics.forEach((d, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const rowY = y;

                if (index % 2 === 1) {
                    doc.rect(50, rowY, 512, rowHeight).fill('#f8fafc');
                }
                doc.rect(50, rowY, 512, rowHeight).stroke(colors.border);

                doc.text(d.subject || '-', 60, rowY + 8, { width: 100 });
                doc.text(d.class_name || '-', 170, rowY + 8, { width: 50 });
                doc.text(`${d.quality_percent || 0}%`, 230, rowY + 8, { width: 70 });
                doc.text(String(d.below_basic_count || 0), 310, rowY + 8, { width: 60 });
                doc.text(String(d.basic_count || 0), 380, rowY + 8, { width: 60 });
                doc.text(String(d.advanced_count || 0), 450, rowY + 8, { width: 50 });
                doc.text(String(d.high_count || 0), 510, rowY + 8, { width: 50 });

                y += rowHeight;
            });

            y += 20;
        }

        // ===== ИНЫЕ МЕРОПРИЯТИЯ =====
        if (teacher.other_documents.length > 0) {
            if (y > 650) {
                doc.addPage();
                y = 50;
            }

            y += 10;
            const tableTop = y;
            const rowHeight = 28;

            doc.rect(50, tableTop, 512, 28).fill(colors.light);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(11).text('ИНЫЕ МЕРОПРИЯТИЯ', 60, tableTop + 8);

            y = tableTop + 28;

            doc.rect(50, y, 512, 24).fill(colors.white).stroke(colors.border);
            doc.fillColor(colors.text).font('RobotoBold').fontSize(9);
            doc.text('НАЗВАНИЕ', 60, y + 7, { width: 300 });
            doc.text('СТАТУС', 370, y + 7, { width: 100 });
            doc.text('УРОВЕНЬ', 480, y + 7, { width: 70 });

            y += 24;

            doc.font('Roboto').fontSize(9).fillColor(colors.text);
            teacher.other_documents.forEach((o, index) => {
                if (y > 720) {
                    doc.addPage();
                    y = 50;
                }

                const rowY = y;

                if (index % 2 === 1) {
                    doc.rect(50, rowY, 512, rowHeight).fill('#f8fafc');
                }
                doc.rect(50, rowY, 512, rowHeight).stroke(colors.border);

                doc.text(o.event_name || '-', 60, rowY + 8, { width: 300 });
                doc.text(o.status || '-', 370, rowY + 8, { width: 100 });
                doc.text(o.event_level || '-', 480, rowY + 8, { width: 70 });

                y += rowHeight;
            });
        }

        // ===== ФУТЕР =====
        const pageRange = doc.bufferedPageRange();
        const startPage = pageRange.start;
        const pageCount = pageRange.count;

        console.log(`PDF: ${pageCount} страниц, начиная с ${startPage}`); // для отладки

        for (let i = 0; i < pageCount; i++) {
            const pageIndex = startPage + i;
            doc.switchToPage(pageIndex);
            doc.rect(0, 742, 612, 50).fill(colors.light);
            doc.fillColor('#64748b').font('Roboto').fontSize(8).text(
                `Платформа "Профиль педагога" • Школа №777 • Страница ${i + 1} из ${pageCount}`,
                50, 762,
                { align: 'center', width: 512 }
            );
        }

        doc.end();

    } catch (error) {
        console.error('Ошибка генерации PDF:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Ошибка генерации PDF: ' + error.message });
        }
    }
};

// Вспомогательная функция для PDF
const getTeacherDataForPdf = async (id) => {
    const { rows: teachers } = await db.query(
        `SELECT t.id, t.full_name,
                COALESCE(array_agg(DISTINCT s.name) FILTER (WHERE s.name IS NOT NULL), ARRAY[]::varchar[]) as subjects
         FROM teachers t
         LEFT JOIN teacher_subjects ts ON t.id = ts.teacher_id
         LEFT JOIN subjects s ON ts.subject_id = s.id
         WHERE t.id = $1
         GROUP BY t.id`,
        [parseInt(id)]
    );

    if (teachers.length === 0) return null;

    const teacher = teachers[0];

    const [
        courses,
        diagnostics,
        mckoTeacherDiags,
        olympiads,
        examResultsOge,
        examResultsEge,
        otherDocs
    ] = await Promise.all([
        db.query('SELECT * FROM courses WHERE teacher_id = $1 ORDER BY completion_date DESC', [id]),
        db.query('SELECT * FROM diagnostics WHERE teacher_id = $1 ORDER BY diagnostic_date DESC', [id]),
        db.query('SELECT * FROM mcko_teacher_diagnostics WHERE teacher_id = $1 ORDER BY diagnostic_date DESC', [id]),
        db.query('SELECT * FROM olympiads WHERE teacher_id = $1 ORDER BY created_at DESC', [id]),
        db.query('SELECT * FROM exam_results_oge WHERE teacher_id = $1 ORDER BY academic_year DESC', [id]),
        db.query('SELECT * FROM exam_results_ege WHERE teacher_id = $1 ORDER BY academic_year DESC', [id]),
        db.query('SELECT * FROM other_documents WHERE teacher_id = $1 ORDER BY event_date DESC', [id])
    ]);

    teacher.courses = courses.rows;
    teacher.diagnostics = diagnostics.rows;
    teacher.mcko_teacher_diagnostics = mckoTeacherDiags.rows;
    teacher.olympiads = olympiads.rows;
    teacher.exam_results_oge = examResultsOge.rows;
    teacher.exam_results_ege = examResultsEge.rows;
    teacher.other_documents = otherDocs.rows;

    return teacher;
};

const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU');
};

// ==================== Удаление отдельных записей ====================

const deleteCourse = async (req, res) => {
    try {
        const { teacherId, courseId } = req.params;
        await db.query('DELETE FROM courses WHERE id = $1 AND teacher_id = $2', [courseId, teacherId]);
        res.json({ message: 'Курс удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления курса' });
    }
};

const deleteDiagnostic = async (req, res) => {
    try {
        const { teacherId, diagId } = req.params;
        await db.query('DELETE FROM diagnostics WHERE id = $1 AND teacher_id = $2', [diagId, teacherId]);
        res.json({ message: 'Диагностика удалена' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления диагностики' });
    }
};

const deleteMckoDiagnostic = async (req, res) => {
    try {
        const { teacherId, diagId } = req.params;
        await db.query('DELETE FROM mcko_teacher_diagnostics WHERE id = $1 AND teacher_id = $2', [diagId, teacherId]);
        res.json({ message: 'Диагностика учителя удалена' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления диагностики учителя' });
    }
};

const deleteOlympiad = async (req, res) => {
    try {
        const { teacherId, olympId } = req.params;
        await db.query('DELETE FROM olympiads WHERE id = $1 AND teacher_id = $2', [olympId, teacherId]);
        res.json({ message: 'Олимпиада удалена' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления олимпиады' });
    }
};

const deleteExamOge = async (req, res) => {
    try {
        const { teacherId, examId } = req.params;
        await db.query('DELETE FROM exam_results_oge WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        res.json({ message: 'Результат ОГЭ удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления результата ОГЭ' });
    }
};

const deleteExamEge = async (req, res) => {
    try {
        const { teacherId, examId } = req.params;
        await db.query('DELETE FROM exam_results_ege WHERE id = $1 AND teacher_id = $2', [examId, teacherId]);
        res.json({ message: 'Результат ЕГЭ удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления результата ЕГЭ' });
    }
};

const deleteOtherDoc = async (req, res) => {
    try {
        const { teacherId, docId } = req.params;
        await db.query('DELETE FROM other_documents WHERE id = $1 AND teacher_id = $2', [docId, teacherId]);
        res.json({ message: 'Документ удалён' });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка удаления документа' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    generatePdf,
    deleteCourse,
    deleteDiagnostic,
    deleteMckoDiagnostic,
    deleteOlympiad,
    deleteExamOge,
    deleteExamEge,
    deleteOtherDoc
};