const db = require('../config/database');

class StatsController {
    // GET /api/stats/dashboard
    async getDashboardStats(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM teachers) as total_teachers,
                    (SELECT COUNT(*) FROM courses) as total_courses,
                    (SELECT COUNT(*) FROM diagnostics) as total_diagnostics,
                    (SELECT COUNT(*) FROM olympiads) as total_olympiads
            `);
            res.json(result.rows[0]);
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    }

    // GET /api/stats/exams-oge-by-subject
    async getExamsOgeBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject,
                    SUM(total_students) as total_students,
                    SUM(grade_2_count) as grade_2_count,
                    SUM(grade_3_count) as grade_3_count,
                    SUM(grade_4_count) as grade_4_count,
                    SUM(grade_5_count) as grade_5_count
                FROM exam_results_oge
                WHERE subject NOT IN ('Русский язык', 'Литература')
                GROUP BY subject
                ORDER BY total_students DESC
            `);

            res.json({
                subjects: result.rows.map(r => r.subject),
                total_students: result.rows.map(r => parseInt(r.total_students) || 0),
                grade_2_counts: result.rows.map(r => parseInt(r.grade_2_count) || 0),
                grade_3_counts: result.rows.map(r => parseInt(r.grade_3_count) || 0),
                grade_4_counts: result.rows.map(r => parseInt(r.grade_4_count) || 0),
                grade_5_counts: result.rows.map(r => parseInt(r.grade_5_count) || 0)
            });
        } catch (err) {
            console.error('Ошибка получения статистики ОГЭ по предметам:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/exams-ege-by-subject
    async getExamsEgeBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject,
                    SUM(total_students) as total_students,
                    SUM(threshold_lt_count) as threshold_0_count,
                    SUM(threshold_0_59_count) as threshold_1_count,
                    SUM(threshold_60_79_count) as threshold_2_count,
                    SUM(threshold_80_100_count) as threshold_3_count
                FROM exam_results_ege
                WHERE subject NOT IN ('Русский язык', 'Литература')
                GROUP BY subject
                ORDER BY total_students DESC
            `);

            res.json({
                subjects: result.rows.map(r => r.subject),
                total_students: result.rows.map(r => parseInt(r.total_students) || 0),
                threshold_0_counts: result.rows.map(r => parseInt(r.threshold_0_count) || 0),
                threshold_1_counts: result.rows.map(r => parseInt(r.threshold_1_count) || 0),
                threshold_2_counts: result.rows.map(r => parseInt(r.threshold_2_count) || 0),
                threshold_3_counts: result.rows.map(r => parseInt(r.threshold_3_count) || 0)
            });
        } catch (err) {
            console.error('Ошибка получения статистики ЕГЭ по предметам:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/olympiads-by-subject
    async getOlympiadsBySubject(req, res) {
        try {
            const query = await db.query(`
                SELECT subject, COUNT(*) as count 
                FROM olympiads 
                GROUP BY subject 
                ORDER BY count DESC
            `);
            res.json({
                labels: query.rows.map(r => r.subject),
                values: query.rows.map(r => parseInt(r.count))
            });
        } catch (err) {
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/vsoh-by-subject
    async getVsohBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject, 
                    COUNT(*) as count,
                    SUM(total_participants) as total_participants,
                    SUM(winners_count) as total_winners,
                    SUM(prize_winners_count) as total_prize_winners
                FROM olympiads 
                WHERE olympiad_type = 'ВсОШ'
                GROUP BY subject 
                ORDER BY count DESC
            `);

            res.json({
                labels: result.rows.map(r => r.subject),
                values: result.rows.map(r => parseInt(r.count)),
                details: result.rows.map(r => ({
                    subject: r.subject,
                    count: parseInt(r.count),
                    participants: parseInt(r.total_participants) || 0,
                    winners: parseInt(r.total_winners) || 0,
                    prizeWinners: parseInt(r.total_prize_winners) || 0
                }))
            });
        } catch (err) {
            console.error('Ошибка получения статистики ВсОШ:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/mosh-by-subject
    async getMoshBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject, 
                    COUNT(*) as count,
                    COUNT(CASE WHEN result ILIKE '%побед%' OR result ILIKE '%1%' THEN 1 END) as winners_count,
                    COUNT(CASE WHEN result ILIKE '%приз%' OR result ILIKE '%2%' OR result ILIKE '%3%' THEN 1 END) as prize_winners_count
                FROM olympiads 
                WHERE olympiad_type = 'МОШ'
                GROUP BY subject 
                ORDER BY count DESC
            `);

            res.json({
                labels: result.rows.map(r => r.subject),
                values: result.rows.map(r => parseInt(r.count)),
                details: result.rows.map(r => ({
                    subject: r.subject,
                    count: parseInt(r.count),
                    winners: parseInt(r.winners_count) || 0,
                    prizeWinners: parseInt(r.prize_winners_count) || 0
                }))
            });
        } catch (err) {
            console.error('Ошибка получения статистики МОШ:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/mcko-class-by-subject
    async getMckoClassBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject, 
                    COUNT(*) as count,
                    AVG(quality_percent) as avg_quality,
                    SUM(total_students) as total_students
                FROM diagnostics 
                GROUP BY subject 
                ORDER BY count DESC
                LIMIT 5
            `);

            res.json({
                subjects: result.rows.map(r => r.subject),
                counts: result.rows.map(r => parseInt(r.count)),
                details: result.rows.map(r => ({
                    subject: r.subject,
                    count: parseInt(r.count),
                    avgQuality: Math.round(r.avg_quality || 0),
                    totalStudents: parseInt(r.total_students) || 0
                }))
            });
        } catch (err) {
            console.error('Ошибка получения статистики МЦКО по классам:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }

    // GET /api/stats/mcko-teacher-by-subject
    async getMckoTeacherBySubject(req, res) {
        try {
            const result = await db.query(`
                SELECT 
                    subject, 
                    COUNT(*) as count,
                    COUNT(CASE WHEN level_achieved ILIKE '%эксперт%' THEN 1 END) as expert_count,
                    COUNT(CASE WHEN level_achieved ILIKE '%высок%' THEN 1 END) as high_count
                FROM mcko_teacher_diagnostics 
                WHERE subject IS NOT NULL AND subject != ''
                GROUP BY subject 
                ORDER BY count DESC
                LIMIT 5
            `);

            res.json({
                subjects: result.rows.map(r => r.subject),
                counts: result.rows.map(r => parseInt(r.count)),
                details: result.rows.map(r => ({
                    subject: r.subject,
                    count: parseInt(r.count),
                    expertCount: parseInt(r.expert_count) || 0,
                    highCount: parseInt(r.high_count) || 0
                }))
            });
        } catch (err) {
            console.error('Ошибка получения статистики МЦКО учителя:', err);
            res.status(500).json({ error: 'Ошибка сервера' });
        }
    }
}

module.exports = new StatsController();