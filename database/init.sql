-- ============================================
-- Удаление старых таблиц (если нужно пересоздать)
-- ============================================
DROP TABLE IF EXISTS mcko_teacher_diagnostics CASCADE;
DROP TABLE IF EXISTS exam_results_ege CASCADE;
DROP TABLE IF EXISTS exam_results_oge CASCADE;
DROP TABLE IF EXISTS teacher_subjects CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;
DROP TABLE IF EXISTS olympiads CASCADE;
DROP TABLE IF EXISTS diagnostics CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS uploaded_files CASCADE;
DROP TABLE IF EXISTS teachers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- Триггер для автоматического updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 1. Пользователи
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'methodist')),
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Индекс для быстрого поиска
CREATE INDEX idx_users_username ON users(username);

-- ============================================
-- 2. Учителя
-- ============================================
CREATE TABLE teachers (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_teachers_full_name ON teachers(LOWER(full_name));

-- ============================================
-- 3. Предметы (справочник)
-- ============================================
CREATE TABLE subjects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) -- математика, языки, естественные науки и т.д.
);

CREATE INDEX idx_subjects_name ON subjects(name);

-- Заполняем стандартные предметы
INSERT INTO subjects (name, category) VALUES
('Математика', 'математика'),
('Русский язык', 'языки'),
('Физика', 'естественные науки'),
('Химия', 'естественные науки'),
('Биология', 'естественные науки'),
('История', 'общественные науки'),
('География', 'общественные науки'),
('Иностранный язык', 'языки'),
('Информатика', 'технические'),
('Литература', 'языки'),
('Обществознание', 'общественные науки'),
('Физкультура', 'прочие');

-- ============================================
-- 4. Связь учителей и предметов (many-to-many)
-- ============================================
CREATE TABLE teacher_subjects (
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    PRIMARY KEY (teacher_id, subject_id)
);

CREATE INDEX idx_teacher_subjects_teacher ON teacher_subjects(teacher_id);
CREATE INDEX idx_teacher_subjects_subject ON teacher_subjects(subject_id);

-- ============================================
-- 5. Загруженные файлы
-- ============================================
CREATE TABLE uploaded_files (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL CHECK (file_type IN ('teachers', 'courses', 'diagnostics', 'olympiads', 'ege', 'oge')),
    academic_year VARCHAR(9) NOT NULL, -- формат: 2023/2024
    uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    records_processed INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'partial', 'failed')),
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_uploaded_files_updated_at BEFORE UPDATE ON uploaded_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_uploaded_files_user ON uploaded_files(uploaded_by);
CREATE INDEX idx_uploaded_files_year ON uploaded_files(academic_year);
CREATE INDEX idx_uploaded_files_status ON uploaded_files(status);

-- ============================================
-- 6. Курсы повышения квалификации
-- ============================================
CREATE TABLE courses (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    course_name VARCHAR(255) NOT NULL,
    course_code VARCHAR(50),
    organization VARCHAR(255) NOT NULL,
    completion_date DATE,
    hours INTEGER DEFAULT 0 CHECK (hours >= 0),
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Уникальность: один курс для учителя в один день
    UNIQUE(teacher_id, course_name, completion_date)
);

CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_courses_teacher ON courses(teacher_id);
CREATE INDEX idx_courses_year ON courses(academic_year);
CREATE INDEX idx_courses_file ON courses(uploaded_file_id);

-- ============================================
-- 7. Диагностики (МЦКО и прочие)
-- ============================================
CREATE TABLE diagnostics (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    exam_type VARCHAR(50) NOT NULL, -- МЦКО, ВПР, итоговая аттестация и т.д.
    diagnostic_date DATE,
    level_achieved VARCHAR(50), -- высокий, базовый, низкий
    quality_percent DECIMAL(5,2), -- процент качества (0-100)
    below_basic_count INTEGER DEFAULT 0 CHECK (below_basic_count >= 0),
    basic_count INTEGER DEFAULT 0 CHECK (basic_count >= 0),
    advanced_count INTEGER DEFAULT 0 CHECK (advanced_count >= 0),
    high_count INTEGER DEFAULT 0 CHECK (high_count >= 0),
    class_name VARCHAR(20), -- 5А, 7Б и т.д.
    total_students INTEGER DEFAULT 0 CHECK (total_students >= 0),
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, subject, diagnostic_date)
);

CREATE TRIGGER update_diagnostics_updated_at BEFORE UPDATE ON diagnostics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_diagnostics_teacher ON diagnostics(teacher_id);
CREATE INDEX idx_diagnostics_subject ON diagnostics(subject);
CREATE INDEX idx_diagnostics_year ON diagnostics(academic_year);
CREATE INDEX idx_diagnostics_file ON diagnostics(uploaded_file_id);

-- ============================================
-- 8. Олимпиады
-- ============================================
CREATE TABLE olympiads (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    olympiad_name VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    olympiad_type VARCHAR(50), -- всероссийская, муниципальная, школьная
    parallel INTEGER CHECK (parallel BETWEEN 1 AND 11), -- класс (1-11)
    class_name VARCHAR(20),
    result VARCHAR(100), -- победитель, призёр, участник
    student VARCHAR(100), -- ФИО ученика (если индивидуальная олимпиада)
    total_participants INTEGER DEFAULT 0 CHECK (total_participants >= 0),
    winners_count INTEGER DEFAULT 0 CHECK (winners_count >= 0),
    prize_winners_count INTEGER DEFAULT 0 CHECK (prize_winners_count >= 0),
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, olympiad_name, subject, academic_year)
);

CREATE TRIGGER update_olympiads_updated_at BEFORE UPDATE ON olympiads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_olympiads_teacher ON olympiads(teacher_id);
CREATE INDEX idx_olympiads_subject ON olympiads(subject);
CREATE INDEX idx_olympiads_year ON olympiads(academic_year);
CREATE INDEX idx_olympiads_file ON olympiads(uploaded_file_id);

-- ============================================
-- 9. Результаты ЕГЭ (отдельная таблица)
-- ============================================
CREATE TABLE exam_results_ege (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    exam_year INTEGER NOT NULL,
    avg_score DECIMAL(5,2),
    quality_percent DECIMAL(5,2),
    success_percent DECIMAL(5,2),
    total_students INTEGER DEFAULT 0,
    students_100ball INTEGER DEFAULT 0,
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, subject, exam_year)
);

CREATE INDEX idx_ege_teacher ON exam_results_ege(teacher_id);
CREATE INDEX idx_ege_year ON exam_results_ege(exam_year);

-- ============================================
-- 10. Результаты ОГЭ (отдельная таблица)
-- ============================================
CREATE TABLE exam_results_oge (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    subject VARCHAR(100) NOT NULL,
    exam_year INTEGER NOT NULL,
    avg_score DECIMAL(5,2),
    quality_percent DECIMAL(5,2),
    success_percent DECIMAL(5,2),
    total_students INTEGER DEFAULT 0,
    students_5ball INTEGER DEFAULT 0,
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, subject, exam_year)
);

CREATE INDEX idx_oge_teacher ON exam_results_oge(teacher_id);
CREATE INDEX idx_oge_year ON exam_results_oge(exam_year);

-- ============================================
-- 11. Диагностики МЦКО для учителей (отдельная таблица)
-- ============================================
CREATE TABLE mcko_teacher_diagnostics (
    id SERIAL PRIMARY KEY,
    teacher_id INTEGER REFERENCES teachers(id) ON DELETE CASCADE,
    diagnostic_type VARCHAR(50) NOT NULL, -- входная, промежуточная, итоговая
    diagnostic_date DATE NOT NULL,
    subject VARCHAR(100) NOT NULL,
    level_achieved VARCHAR(50),
    percent_correct DECIMAL(5,2),
    academic_year VARCHAR(9) NOT NULL,
    uploaded_file_id INTEGER REFERENCES uploaded_files(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(teacher_id, diagnostic_type, subject, diagnostic_date)
);

CREATE INDEX idx_mcko_teacher ON mcko_teacher_diagnostics(teacher_id);
CREATE INDEX idx_mcko_year ON mcko_teacher_diagnostics(academic_year);

-- ============================================
-- 12. Начальный администратор (пароль будет установлен через env)
-- ============================================
-- Пароль: 'admin123' (bcrypt hash)
-- ВНИМАНИЕ: Изменить при первом запуске в production!
INSERT INTO users (username, password_hash, role, full_name) VALUES (
    'admin',
    '$2b$10$YourHashHereShouldBeReplacedWithRealBcryptHash',
    'admin',
    'Администратор системы'
);