const db = require('../config/database');
const teacherService = require('./teacherService');
const parsers = require('../parsers');
const xlsx = require('xlsx');

class ParserService {
    excelDateToJSDate(excelDate) {
        if (!excelDate) return null;
        if (typeof excelDate === 'string' && excelDate.includes('.')) {
            const [d, m, y] = excelDate.split('.');
            return `${y}-${m}-${d}`;
        }
        if (typeof excelDate === 'number') {
            return new Date((excelDate - 25569) * 86400 * 1000).toISOString().split('T')[0];
        }
        return excelDate;
    }

    async isDuplicateRecord(table, teacherId, uniqueFields) {
        const keys = Object.keys(uniqueFields);
        if (keys.length === 0) return false;
        const conditions = keys.map((key, i) => `${key} = $${i + 2}`).join(' AND ');
        const values = Object.values(uniqueFields);
        const query = `SELECT id FROM ${table} WHERE teacher_id = $1 AND ${conditions} LIMIT 1`;
        const result = await db.query(query, [teacherId, ...values]);
        return result.rows.length > 0;
    }

    parseBuffer(buffer, fileType, academicYear, originalName) {
        switch (fileType) {
            case 'mcko_class':
                return parsers.mckoClassParser.parse(buffer, academicYear, originalName);
            case 'mcko_teacher':
                return parsers.mckoTeachersParser.parse(buffer, academicYear, originalName);
            case 'courses':
                return parsers.coursesParser.parse(buffer, academicYear, originalName);
            case 'vsoh':
                return parsers.vsohParser.parse(buffer, academicYear, originalName);
            case 'olympiad':
                return parsers.olympiadParser.parse(buffer, academicYear, originalName);
            case 'exam_ege':
                return parsers.egeParser.parse(buffer, academicYear, originalName);
            case 'exam_oge':
                return parsers.ogeParser.parse(buffer, academicYear, originalName);
            case 'other':
                return parsers.otherParser.parse(buffer, academicYear, originalName);
            default:
                throw new Error('Неизвестный тип файла: ' + fileType);
        }
    }

    async analyzeFileForPreview(buffer, fileType, academicYear, originalName) {
        const records = [];
        const newTeachers = new Set();
        const duplicates = new Set();

        switch (fileType) {
            case 'mcko_class': {
                const data = parsers.mckoClassParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('diagnostics', teacherId, {
                            diagnostic_date: item.diagnostic_date,
                            subject: item.subject,
                            class_name: item.class_name,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ${item.class_name}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject,
                        type: `МЦКО ${item.class_name}`,
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'mcko_teacher': {
                const data = parsers.mckoTeachersParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('mcko_teacher_diagnostics', teacherId, {
                            diagnostic_date: item.diagnostic_date,
                            exam_type: item.exam_type,
                            subject: item.subject,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ${item.exam_type}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject || 'Общий',
                        type: 'МЦКО (учителя)',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'courses': {
                const data = parsers.coursesParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('courses', teacherId, {
                            course_code: item.course_code,
                            completion_date: item.completion_date
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ${item.course_name}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.course_name,
                        type: 'Курс',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'vsoh': {
                const data = parsers.vsohParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('olympiads', teacherId, {
                            olympiad_name: 'ВсОШ',
                            subject: item.subject,
                            stage: item.stage,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ВсОШ ${item.stage}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject,
                        type: `ВсОШ (${item.stage})`,
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'olympiad': {
                const data = parsers.olympiadParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('olympiads', teacherId, {
                            olympiad_name: 'МОШ',
                            subject: item.subject,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - МОШ`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject,
                        type: 'МОШ',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'exam_ege': {
                const data = parsers.egeParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('exam_results_ege', teacherId, {
                            subject: item.subject,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ЕГЭ ${item.subject}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject,
                        type: 'ЕГЭ',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'exam_oge': {
                const data = parsers.ogeParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('exam_results_oge', teacherId, {
                            subject: item.subject,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ОГЭ ${item.subject}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.subject,
                        type: 'ОГЭ',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            case 'other': {
                const data = parsers.otherParser.parse(buffer, academicYear, originalName);
                for (const item of data) {
                    const teacher = await teacherService.findTeacherByName(item.full_name);
                    const isNew = !teacher;
                    const teacherId = teacher?.id;

                    let isDup = false;
                    if (teacherId) {
                        isDup = await this.isDuplicateRecord('other_documents', teacherId, {
                            event_name: item.event_name,
                            academic_year: academicYear
                        });
                    }

                    if (isNew) newTeachers.add(item.full_name);
                    if (isDup) duplicates.add(`${item.full_name} - ${item.event_name}`);

                    records.push({
                        fio: item.full_name,
                        subject: item.event_name,
                        type: 'Иное',
                        isNew,
                        isDuplicate: isDup
                    });
                }
                break;
            }

            default:
                throw new Error('Неизвестный тип файла: ' + fileType);
        }

        return {
            records,
            totalRecords: records.length,
            newTeachers: Array.from(newTeachers),
            duplicates: Array.from(duplicates),
            fileType
        };
    }

    async executeImport(buffer, fileType, academicYear, uploadedFileId, originalName) {
        const stats = {
            teachersFound: 0,
            teachersCreated: 0,
            duplicatesSkipped: 0,
            recordsImported: 0
        };

        const data = this.parseBuffer(buffer, fileType, academicYear, originalName);

        switch (fileType) {
            case 'mcko_class': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, item.subject ? [item.subject] : []);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('diagnostics', teacher.id, {
                        diagnostic_date: item.diagnostic_date,
                        subject: item.subject,
                        class_name: item.class_name,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO diagnostics (
                                teacher_id, diagnostic_date, subject, class_name,
                                total_students, quality_percent, below_basic_count, basic_count, advanced_count, high_count, 
                                academic_year, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                            [
                                teacher.id, item.diagnostic_date, item.subject, item.class_name,
                                item.total_students, item.quality_percent,
                                item.below_basic_count, item.basic_count, item.advanced_count, item.high_count,
                                academicYear, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'mcko_teacher': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, item.subject ? [item.subject] : []);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('mcko_teacher_diagnostics', teacher.id, {
                        diagnostic_date: item.diagnostic_date,
                        exam_type: item.exam_type,
                        subject: item.subject,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO mcko_teacher_diagnostics (
                                teacher_id, diagnostic_date, end_date, exam_type, 
                                subject, level_achieved, is_published, publication_date, academic_year, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                            [
                                teacher.id, item.diagnostic_date, item.end_date, item.exam_type,
                                item.subject, item.level_achieved, item.is_published,
                                item.publication_date, academicYear, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'courses': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('courses', teacher.id, {
                        course_code: item.course_code,
                        completion_date: item.completion_date
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO courses (teacher_id, course_code, course_name, organization, completion_date, hours, academic_year, uploaded_file_id)
                            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                            [teacher.id, item.course_code, item.course_name, item.organization, item.completion_date, item.hours || 0, academicYear, uploadedFileId]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'vsoh': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, [item.subject]);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('olympiads', teacher.id, {
                        olympiad_name: 'ВсОШ',
                        subject: item.subject,
                        stage: item.stage,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO olympiads (
                                teacher_id, olympiad_name, olympiad_type, subject, stage, 
                                academic_year, total_participants, winners_count, prize_winners_count, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                            [
                                teacher.id, 'ВсОШ', 'ВсОШ', item.subject, item.stage,
                                academicYear, item.total_participants, item.winners_count, item.prize_winners_count, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'olympiad': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, [item.subject]);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('olympiads', teacher.id, {
                        olympiad_name: 'МОШ',
                        subject: item.subject,
                        parallel: item.parallel,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO olympiads (
                                teacher_id, olympiad_name, olympiad_type, subject, 
                                parallel, class_name, result, student, academic_year, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                            [
                                teacher.id, 'МОШ', 'МОШ', item.subject,
                                item.parallel, item.class_name, item.result, item.student, academicYear, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'exam_ege': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, [item.subject]);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('exam_results_ege', teacher.id, {
                        subject: item.subject,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO exam_results_ege (
                                teacher_id, subject, academic_year, 
                                total_students, threshold_lt_count, threshold_0_59_count, 
                                threshold_60_79_count, threshold_80_100_count, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [
                                teacher.id, item.subject, academicYear,
                                item.total_students, item.threshold_lt_count,
                                item.threshold_0_59_count, item.threshold_60_79_count,
                                item.threshold_80_100_count, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'exam_oge': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name, [item.subject]);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('exam_results_oge', teacher.id, {
                        subject: item.subject,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO exam_results_oge (
                                teacher_id, subject, academic_year, 
                                total_students, grade_2_count, grade_3_count, 
                                grade_4_count, grade_5_count, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [
                                teacher.id, item.subject, academicYear,
                                item.total_students, item.grade_2_count,
                                item.grade_3_count, item.grade_4_count, item.grade_5_count,
                                uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            case 'other': {
                for (const item of data) {
                    const teacher = await teacherService.findOrCreate(item.full_name);
                    if (teacher.isNew) stats.teachersCreated++;
                    else stats.teachersFound++;

                    const isDup = await this.isDuplicateRecord('other_documents', teacher.id, {
                        event_name: item.event_name,
                        academic_year: academicYear
                    });

                    if (!isDup) {
                        await db.query(`
                            INSERT INTO other_documents (
                                teacher_id, event_name, status, participants_count, 
                                event_date, event_level, role, academic_year, uploaded_file_id
                            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                            [
                                teacher.id, item.event_name, item.status,
                                item.participants_count || 0, item.event_date,
                                item.event_level, item.role, academicYear, uploadedFileId
                            ]
                        );
                        stats.recordsImported++;
                    } else {
                        stats.duplicatesSkipped++;
                    }
                }
                break;
            }

            default:
                throw new Error('Неизвестный тип файла для импорта: ' + fileType);
        }

        return stats;
    }
}

module.exports = new ParserService();