--
-- PostgreSQL database dump
--

\restrict FndLhOZh5ncg7LAeLyNw0phtM9SB9yV2Jk7svereXfuoTjXLEvUUmGgqeg3Pkbp

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-02-17 23:40:50

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 880 (class 1247 OID 17132)
-- Name: olympiad_stage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.olympiad_stage AS ENUM (
    'Школьный',
    'Муниципальный',
    'Региональный',
    'Заключительный'
);


ALTER TYPE public.olympiad_stage OWNER TO postgres;

--
-- TOC entry 877 (class 1247 OID 17126)
-- Name: user_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'methodist'
);


ALTER TYPE public.user_role OWNER TO postgres;

--
-- TOC entry 244 (class 1255 OID 17631)
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 227 (class 1259 OID 17469)
-- Name: courses; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.courses (
    id integer NOT NULL,
    teacher_id integer,
    course_code character varying(50),
    course_name character varying(255) NOT NULL,
    organization character varying(255),
    completion_date date,
    hours integer,
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    uploaded_file_id integer
);


ALTER TABLE public.courses OWNER TO postgres;

--
-- TOC entry 226 (class 1259 OID 17468)
-- Name: courses_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.courses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.courses_id_seq OWNER TO postgres;

--
-- TOC entry 5158 (class 0 OID 0)
-- Dependencies: 226
-- Name: courses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.courses_id_seq OWNED BY public.courses.id;


--
-- TOC entry 229 (class 1259 OID 17489)
-- Name: diagnostics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.diagnostics (
    id integer NOT NULL,
    teacher_id integer,
    diagnostic_date date,
    exam_type character varying(50) DEFAULT 'МЦКО'::character varying,
    subject character varying(100),
    class_name character varying(20),
    total_students integer DEFAULT 0,
    quality_percent integer,
    below_basic_count integer DEFAULT 0,
    basic_count integer DEFAULT 0,
    advanced_count integer DEFAULT 0,
    high_count integer DEFAULT 0,
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    uploaded_file_id integer
);


ALTER TABLE public.diagnostics OWNER TO postgres;

--
-- TOC entry 228 (class 1259 OID 17488)
-- Name: diagnostics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.diagnostics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.diagnostics_id_seq OWNER TO postgres;

--
-- TOC entry 5159 (class 0 OID 0)
-- Dependencies: 228
-- Name: diagnostics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.diagnostics_id_seq OWNED BY public.diagnostics.id;


--
-- TOC entry 235 (class 1259 OID 17559)
-- Name: exam_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_results (
    id integer NOT NULL,
    teacher_id integer,
    exam_type character varying(10) NOT NULL,
    subject character varying(100) NOT NULL,
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    total_students integer DEFAULT 0,
    threshold_1_count integer DEFAULT 0,
    threshold_2_count integer DEFAULT 0,
    threshold_3_count integer DEFAULT 0,
    threshold_4_count integer DEFAULT 0,
    grade_2_count integer DEFAULT 0,
    grade_3_count integer DEFAULT 0,
    grade_4_count integer DEFAULT 0,
    grade_5_count integer DEFAULT 0,
    good_count integer GENERATED ALWAYS AS (
CASE
    WHEN ((exam_type)::text = 'ЕГЭ'::text) THEN (threshold_3_count + threshold_4_count)
    ELSE (grade_4_count + grade_5_count)
END) STORED,
    excellent_count integer GENERATED ALWAYS AS (
CASE
    WHEN ((exam_type)::text = 'ЕГЭ'::text) THEN threshold_4_count
    ELSE grade_5_count
END) STORED,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    CONSTRAINT exam_results_exam_type_check CHECK (((exam_type)::text = ANY ((ARRAY['ОГЭ'::character varying, 'ЕГЭ'::character varying])::text[])))
);


ALTER TABLE public.exam_results OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 18041)
-- Name: exam_results_ege; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_results_ege (
    id integer NOT NULL,
    teacher_id integer,
    subject character varying(255) NOT NULL,
    academic_year character varying(10) NOT NULL,
    total_students integer DEFAULT 0,
    threshold_lt_count integer DEFAULT 0,
    threshold_0_59_count integer DEFAULT 0,
    threshold_60_79_count integer DEFAULT 0,
    threshold_80_100_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_file_id integer
);


ALTER TABLE public.exam_results_ege OWNER TO postgres;

--
-- TOC entry 242 (class 1259 OID 18040)
-- Name: exam_results_ege_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_results_ege_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_results_ege_id_seq OWNER TO postgres;

--
-- TOC entry 5160 (class 0 OID 0)
-- Dependencies: 242
-- Name: exam_results_ege_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_results_ege_id_seq OWNED BY public.exam_results_ege.id;


--
-- TOC entry 234 (class 1259 OID 17558)
-- Name: exam_results_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_results_id_seq OWNER TO postgres;

--
-- TOC entry 5161 (class 0 OID 0)
-- Dependencies: 234
-- Name: exam_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_results_id_seq OWNED BY public.exam_results.id;


--
-- TOC entry 241 (class 1259 OID 18019)
-- Name: exam_results_oge; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.exam_results_oge (
    id integer NOT NULL,
    teacher_id integer,
    subject character varying(255) NOT NULL,
    academic_year character varying(10) NOT NULL,
    total_students integer DEFAULT 0,
    grade_2_count integer DEFAULT 0,
    grade_3_count integer DEFAULT 0,
    grade_4_count integer DEFAULT 0,
    grade_5_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_file_id integer
);


ALTER TABLE public.exam_results_oge OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 18018)
-- Name: exam_results_oge_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.exam_results_oge_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.exam_results_oge_id_seq OWNER TO postgres;

--
-- TOC entry 5162 (class 0 OID 0)
-- Dependencies: 240
-- Name: exam_results_oge_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.exam_results_oge_id_seq OWNED BY public.exam_results_oge.id;


--
-- TOC entry 231 (class 1259 OID 17515)
-- Name: mcko_teacher_diagnostics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.mcko_teacher_diagnostics (
    id integer NOT NULL,
    teacher_id integer,
    diagnostic_date date,
    end_date date,
    exam_type character varying(100),
    subject character varying(100),
    level_achieved character varying(50),
    is_published boolean DEFAULT false,
    publication_date date,
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    uploaded_file_id integer
);


ALTER TABLE public.mcko_teacher_diagnostics OWNER TO postgres;

--
-- TOC entry 230 (class 1259 OID 17514)
-- Name: mcko_teacher_diagnostics_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.mcko_teacher_diagnostics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.mcko_teacher_diagnostics_id_seq OWNER TO postgres;

--
-- TOC entry 5163 (class 0 OID 0)
-- Dependencies: 230
-- Name: mcko_teacher_diagnostics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.mcko_teacher_diagnostics_id_seq OWNED BY public.mcko_teacher_diagnostics.id;


--
-- TOC entry 233 (class 1259 OID 17535)
-- Name: olympiads; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.olympiads (
    id integer NOT NULL,
    teacher_id integer,
    olympiad_name character varying(50) NOT NULL,
    olympiad_type character varying(50) NOT NULL,
    subject character varying(100),
    stage character varying(50),
    parallel integer,
    class_name character varying(20),
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    total_participants integer DEFAULT 0,
    winners_count integer DEFAULT 0,
    prize_winners_count integer DEFAULT 0,
    result character varying(50),
    student character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    uploaded_file_id integer
);


ALTER TABLE public.olympiads OWNER TO postgres;

--
-- TOC entry 232 (class 1259 OID 17534)
-- Name: olympiads_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.olympiads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.olympiads_id_seq OWNER TO postgres;

--
-- TOC entry 5164 (class 0 OID 0)
-- Dependencies: 232
-- Name: olympiads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.olympiads_id_seq OWNED BY public.olympiads.id;


--
-- TOC entry 237 (class 1259 OID 17594)
-- Name: other_documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.other_documents (
    id integer NOT NULL,
    teacher_id integer,
    event_name character varying(255) NOT NULL,
    status character varying(100),
    participants_count integer DEFAULT 0,
    event_date date,
    event_level character varying(50),
    role character varying(50),
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    uploaded_file_id integer
);


ALTER TABLE public.other_documents OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 17593)
-- Name: other_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.other_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.other_documents_id_seq OWNER TO postgres;

--
-- TOC entry 5165 (class 0 OID 0)
-- Dependencies: 236
-- Name: other_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.other_documents_id_seq OWNED BY public.other_documents.id;


--
-- TOC entry 224 (class 1259 OID 17441)
-- Name: subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subjects (
    id integer NOT NULL,
    name character varying(100) NOT NULL
);


ALTER TABLE public.subjects OWNER TO postgres;

--
-- TOC entry 223 (class 1259 OID 17440)
-- Name: subjects_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subjects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subjects_id_seq OWNER TO postgres;

--
-- TOC entry 5166 (class 0 OID 0)
-- Dependencies: 223
-- Name: subjects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subjects_id_seq OWNED BY public.subjects.id;


--
-- TOC entry 225 (class 1259 OID 17451)
-- Name: teacher_subjects; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teacher_subjects (
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL
);


ALTER TABLE public.teacher_subjects OWNER TO postgres;

--
-- TOC entry 222 (class 1259 OID 17427)
-- Name: teachers; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.teachers (
    id integer NOT NULL,
    full_name character varying(100) NOT NULL,
    subjects text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.teachers OWNER TO postgres;

--
-- TOC entry 221 (class 1259 OID 17426)
-- Name: teachers_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.teachers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.teachers_id_seq OWNER TO postgres;

--
-- TOC entry 5167 (class 0 OID 0)
-- Dependencies: 221
-- Name: teachers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.teachers_id_seq OWNED BY public.teachers.id;


--
-- TOC entry 239 (class 1259 OID 17613)
-- Name: uploaded_files; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.uploaded_files (
    id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50),
    records_processed integer DEFAULT 0,
    uploaded_by integer,
    status character varying(20) DEFAULT 'completed'::character varying,
    academic_year character varying(9) DEFAULT '2025/2026'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    year integer DEFAULT EXTRACT(year FROM CURRENT_DATE)
);


ALTER TABLE public.uploaded_files OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 17612)
-- Name: uploaded_files_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.uploaded_files_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.uploaded_files_id_seq OWNER TO postgres;

--
-- TOC entry 5168 (class 0 OID 0)
-- Dependencies: 238
-- Name: uploaded_files_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.uploaded_files_id_seq OWNED BY public.uploaded_files.id;


--
-- TOC entry 220 (class 1259 OID 17411)
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(20) DEFAULT 'methodist'::character varying,
    full_name character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY ((ARRAY['admin'::character varying, 'methodist'::character varying])::text[])))
);


ALTER TABLE public.users OWNER TO postgres;

--
-- TOC entry 219 (class 1259 OID 17410)
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO postgres;

--
-- TOC entry 5169 (class 0 OID 0)
-- Dependencies: 219
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- TOC entry 4829 (class 2604 OID 17472)
-- Name: courses id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses ALTER COLUMN id SET DEFAULT nextval('public.courses_id_seq'::regclass);


--
-- TOC entry 4833 (class 2604 OID 17492)
-- Name: diagnostics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnostics ALTER COLUMN id SET DEFAULT nextval('public.diagnostics_id_seq'::regclass);


--
-- TOC entry 4855 (class 2604 OID 17562)
-- Name: exam_results id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results ALTER COLUMN id SET DEFAULT nextval('public.exam_results_id_seq'::regclass);


--
-- TOC entry 4890 (class 2604 OID 18044)
-- Name: exam_results_ege id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_ege ALTER COLUMN id SET DEFAULT nextval('public.exam_results_ege_id_seq'::regclass);


--
-- TOC entry 4882 (class 2604 OID 18022)
-- Name: exam_results_oge id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_oge ALTER COLUMN id SET DEFAULT nextval('public.exam_results_oge_id_seq'::regclass);


--
-- TOC entry 4843 (class 2604 OID 17518)
-- Name: mcko_teacher_diagnostics id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcko_teacher_diagnostics ALTER COLUMN id SET DEFAULT nextval('public.mcko_teacher_diagnostics_id_seq'::regclass);


--
-- TOC entry 4848 (class 2604 OID 17538)
-- Name: olympiads id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.olympiads ALTER COLUMN id SET DEFAULT nextval('public.olympiads_id_seq'::regclass);


--
-- TOC entry 4871 (class 2604 OID 17597)
-- Name: other_documents id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.other_documents ALTER COLUMN id SET DEFAULT nextval('public.other_documents_id_seq'::regclass);


--
-- TOC entry 4828 (class 2604 OID 17444)
-- Name: subjects id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects ALTER COLUMN id SET DEFAULT nextval('public.subjects_id_seq'::regclass);


--
-- TOC entry 4825 (class 2604 OID 17430)
-- Name: teachers id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers ALTER COLUMN id SET DEFAULT nextval('public.teachers_id_seq'::regclass);


--
-- TOC entry 4876 (class 2604 OID 17616)
-- Name: uploaded_files id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files ALTER COLUMN id SET DEFAULT nextval('public.uploaded_files_id_seq'::regclass);


--
-- TOC entry 4821 (class 2604 OID 17414)
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- TOC entry 4914 (class 2606 OID 17480)
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- TOC entry 4919 (class 2606 OID 17503)
-- Name: diagnostics diagnostics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_pkey PRIMARY KEY (id);


--
-- TOC entry 4921 (class 2606 OID 17505)
-- Name: diagnostics diagnostics_teacher_id_subject_class_name_diagnostic_date_a_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_teacher_id_subject_class_name_diagnostic_date_a_key UNIQUE (teacher_id, subject, class_name, diagnostic_date, academic_year);


--
-- TOC entry 4958 (class 2606 OID 18056)
-- Name: exam_results_ege exam_results_ege_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_ege
    ADD CONSTRAINT exam_results_ege_pkey PRIMARY KEY (id);


--
-- TOC entry 4955 (class 2606 OID 18034)
-- Name: exam_results_oge exam_results_oge_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_oge
    ADD CONSTRAINT exam_results_oge_pkey PRIMARY KEY (id);


--
-- TOC entry 4940 (class 2606 OID 17582)
-- Name: exam_results exam_results_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_pkey PRIMARY KEY (id);


--
-- TOC entry 4942 (class 2606 OID 17584)
-- Name: exam_results exam_results_teacher_id_exam_type_subject_academic_year_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_teacher_id_exam_type_subject_academic_year_key UNIQUE (teacher_id, exam_type, subject, academic_year);


--
-- TOC entry 4930 (class 2606 OID 17524)
-- Name: mcko_teacher_diagnostics mcko_teacher_diagnostics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcko_teacher_diagnostics
    ADD CONSTRAINT mcko_teacher_diagnostics_pkey PRIMARY KEY (id);


--
-- TOC entry 4932 (class 2606 OID 17526)
-- Name: mcko_teacher_diagnostics mcko_teacher_diagnostics_teacher_id_exam_type_subject_diagn_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcko_teacher_diagnostics
    ADD CONSTRAINT mcko_teacher_diagnostics_teacher_id_exam_type_subject_diagn_key UNIQUE (teacher_id, exam_type, subject, diagnostic_date, academic_year);


--
-- TOC entry 4938 (class 2606 OID 17549)
-- Name: olympiads olympiads_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.olympiads
    ADD CONSTRAINT olympiads_pkey PRIMARY KEY (id);


--
-- TOC entry 4950 (class 2606 OID 17604)
-- Name: other_documents other_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.other_documents
    ADD CONSTRAINT other_documents_pkey PRIMARY KEY (id);


--
-- TOC entry 4908 (class 2606 OID 17450)
-- Name: subjects subjects_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_name_key UNIQUE (name);


--
-- TOC entry 4910 (class 2606 OID 17448)
-- Name: subjects subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subjects
    ADD CONSTRAINT subjects_pkey PRIMARY KEY (id);


--
-- TOC entry 4912 (class 2606 OID 17457)
-- Name: teacher_subjects teacher_subjects_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_pkey PRIMARY KEY (teacher_id, subject_id);


--
-- TOC entry 4906 (class 2606 OID 17438)
-- Name: teachers teachers_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teachers
    ADD CONSTRAINT teachers_pkey PRIMARY KEY (id);


--
-- TOC entry 4953 (class 2606 OID 17624)
-- Name: uploaded_files uploaded_files_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_pkey PRIMARY KEY (id);


--
-- TOC entry 4901 (class 2606 OID 17423)
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- TOC entry 4903 (class 2606 OID 17425)
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- TOC entry 4915 (class 1259 OID 17486)
-- Name: idx_courses_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_teacher ON public.courses USING btree (teacher_id);


--
-- TOC entry 4916 (class 1259 OID 18097)
-- Name: idx_courses_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_uploaded_file_id ON public.courses USING btree (uploaded_file_id);


--
-- TOC entry 4917 (class 1259 OID 17487)
-- Name: idx_courses_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_courses_year ON public.courses USING btree (academic_year);


--
-- TOC entry 4922 (class 1259 OID 17513)
-- Name: idx_diagnostics_subject; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diagnostics_subject ON public.diagnostics USING btree (subject);


--
-- TOC entry 4923 (class 1259 OID 17511)
-- Name: idx_diagnostics_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diagnostics_teacher ON public.diagnostics USING btree (teacher_id);


--
-- TOC entry 4924 (class 1259 OID 18098)
-- Name: idx_diagnostics_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diagnostics_uploaded_file_id ON public.diagnostics USING btree (uploaded_file_id);


--
-- TOC entry 4925 (class 1259 OID 17512)
-- Name: idx_diagnostics_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_diagnostics_year ON public.diagnostics USING btree (academic_year);


--
-- TOC entry 4959 (class 1259 OID 18102)
-- Name: idx_exam_ege_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_ege_uploaded_file_id ON public.exam_results_ege USING btree (uploaded_file_id);


--
-- TOC entry 4956 (class 1259 OID 18101)
-- Name: idx_exam_oge_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_oge_uploaded_file_id ON public.exam_results_oge USING btree (uploaded_file_id);


--
-- TOC entry 4943 (class 1259 OID 17590)
-- Name: idx_exam_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_teacher ON public.exam_results USING btree (teacher_id);


--
-- TOC entry 4944 (class 1259 OID 17592)
-- Name: idx_exam_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_type ON public.exam_results USING btree (exam_type);


--
-- TOC entry 4945 (class 1259 OID 17591)
-- Name: idx_exam_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_exam_year ON public.exam_results USING btree (academic_year);


--
-- TOC entry 4951 (class 1259 OID 17630)
-- Name: idx_files_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_files_year ON public.uploaded_files USING btree (academic_year);


--
-- TOC entry 4926 (class 1259 OID 17532)
-- Name: idx_mcko_teacher_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mcko_teacher_teacher ON public.mcko_teacher_diagnostics USING btree (teacher_id);


--
-- TOC entry 4927 (class 1259 OID 18099)
-- Name: idx_mcko_teacher_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mcko_teacher_uploaded_file_id ON public.mcko_teacher_diagnostics USING btree (uploaded_file_id);


--
-- TOC entry 4928 (class 1259 OID 17533)
-- Name: idx_mcko_teacher_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_mcko_teacher_year ON public.mcko_teacher_diagnostics USING btree (academic_year);


--
-- TOC entry 4933 (class 1259 OID 17555)
-- Name: idx_olympiads_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_olympiads_teacher ON public.olympiads USING btree (teacher_id);


--
-- TOC entry 4934 (class 1259 OID 17557)
-- Name: idx_olympiads_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_olympiads_type ON public.olympiads USING btree (olympiad_type);


--
-- TOC entry 4935 (class 1259 OID 18100)
-- Name: idx_olympiads_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_olympiads_uploaded_file_id ON public.olympiads USING btree (uploaded_file_id);


--
-- TOC entry 4936 (class 1259 OID 17556)
-- Name: idx_olympiads_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_olympiads_year ON public.olympiads USING btree (academic_year);


--
-- TOC entry 4946 (class 1259 OID 18103)
-- Name: idx_other_docs_uploaded_file_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_other_docs_uploaded_file_id ON public.other_documents USING btree (uploaded_file_id);


--
-- TOC entry 4947 (class 1259 OID 17610)
-- Name: idx_other_teacher; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_other_teacher ON public.other_documents USING btree (teacher_id);


--
-- TOC entry 4948 (class 1259 OID 17611)
-- Name: idx_other_year; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_other_year ON public.other_documents USING btree (academic_year);


--
-- TOC entry 4904 (class 1259 OID 17439)
-- Name: idx_teachers_fullname; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_teachers_fullname ON public.teachers USING btree (full_name);


--
-- TOC entry 4980 (class 2620 OID 17633)
-- Name: exam_results update_exam_results_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_exam_results_updated_at BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4979 (class 2620 OID 17632)
-- Name: teachers update_teachers_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON public.teachers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4978 (class 2620 OID 17634)
-- Name: users update_users_updated_at; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- TOC entry 4962 (class 2606 OID 17481)
-- Name: courses courses_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4963 (class 2606 OID 18062)
-- Name: courses courses_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4964 (class 2606 OID 17506)
-- Name: diagnostics diagnostics_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4965 (class 2606 OID 18067)
-- Name: diagnostics diagnostics_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.diagnostics
    ADD CONSTRAINT diagnostics_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4976 (class 2606 OID 18057)
-- Name: exam_results_ege exam_results_ege_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_ege
    ADD CONSTRAINT exam_results_ege_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4977 (class 2606 OID 18087)
-- Name: exam_results_ege exam_results_ege_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_ege
    ADD CONSTRAINT exam_results_ege_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4974 (class 2606 OID 18035)
-- Name: exam_results_oge exam_results_oge_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_oge
    ADD CONSTRAINT exam_results_oge_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4975 (class 2606 OID 18082)
-- Name: exam_results_oge exam_results_oge_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results_oge
    ADD CONSTRAINT exam_results_oge_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4970 (class 2606 OID 17585)
-- Name: exam_results exam_results_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.exam_results
    ADD CONSTRAINT exam_results_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4966 (class 2606 OID 17527)
-- Name: mcko_teacher_diagnostics mcko_teacher_diagnostics_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcko_teacher_diagnostics
    ADD CONSTRAINT mcko_teacher_diagnostics_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4967 (class 2606 OID 18072)
-- Name: mcko_teacher_diagnostics mcko_teacher_diagnostics_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.mcko_teacher_diagnostics
    ADD CONSTRAINT mcko_teacher_diagnostics_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4968 (class 2606 OID 17550)
-- Name: olympiads olympiads_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.olympiads
    ADD CONSTRAINT olympiads_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4969 (class 2606 OID 18077)
-- Name: olympiads olympiads_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.olympiads
    ADD CONSTRAINT olympiads_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4971 (class 2606 OID 17605)
-- Name: other_documents other_documents_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.other_documents
    ADD CONSTRAINT other_documents_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4972 (class 2606 OID 18092)
-- Name: other_documents other_documents_uploaded_file_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.other_documents
    ADD CONSTRAINT other_documents_uploaded_file_id_fkey FOREIGN KEY (uploaded_file_id) REFERENCES public.uploaded_files(id) ON DELETE CASCADE;


--
-- TOC entry 4960 (class 2606 OID 17463)
-- Name: teacher_subjects teacher_subjects_subject_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_subject_id_fkey FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;


--
-- TOC entry 4961 (class 2606 OID 17458)
-- Name: teacher_subjects teacher_subjects_teacher_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.teacher_subjects
    ADD CONSTRAINT teacher_subjects_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teachers(id) ON DELETE CASCADE;


--
-- TOC entry 4973 (class 2606 OID 17625)
-- Name: uploaded_files uploaded_files_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.uploaded_files
    ADD CONSTRAINT uploaded_files_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


-- Completed on 2026-02-17 23:40:51

--
-- PostgreSQL database dump complete
--

\unrestrict FndLhOZh5ncg7LAeLyNw0phtM9SB9yV2Jk7svereXfuoTjXLEvUUmGgqeg3Pkbp

