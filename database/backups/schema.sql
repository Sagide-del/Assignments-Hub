-- Assignments Hub - CBC Kenya SaaS
-- Reference DDL. The source of truth is backend/prisma/schema.prisma;
-- run `npm run prisma:migrate` in backend/ to generate real migrations.
-- This file documents the resulting schema for anyone browsing the repo
-- without a Node toolchain.

CREATE TYPE role AS ENUM ('PLATFORM_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'STUDENT');
CREATE TYPE subscription_status AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');
CREATE TYPE assignment_type AS ENUM ('AUTO_MARKED', 'TEACHER_MARKED', 'PRACTICAL');

CREATE TABLE schools (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(20) UNIQUE NOT NULL,        -- short code used at login
  logo VARCHAR(255),
  subscription_status subscription_status NOT NULL DEFAULT 'TRIAL',
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  role role NOT NULL,
  email VARCHAR(255),                      -- staff login
  password_hash VARCHAR(255),              -- staff login (bcrypt)
  admission_number VARCHAR(100),           -- student login
  grade VARCHAR(50),                       -- student's grade/class, e.g. "Grade 7"
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE (school_id, email),
  UNIQUE (school_id, admission_number)
);
CREATE INDEX idx_users_school_id ON users(school_id);

CREATE TABLE assignments (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  subject VARCHAR(100) NOT NULL,
  grade VARCHAR(50) NOT NULL,
  type assignment_type NOT NULL DEFAULT 'TEACHER_MARKED',
  created_by_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_assignments_school_id ON assignments(school_id);

CREATE TABLE submissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score INTEGER,
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);

CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan VARCHAR(100) NOT NULL,
  status subscription_status NOT NULL DEFAULT 'TRIAL',
  started_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP
);
CREATE INDEX idx_subscriptions_school_id ON subscriptions(school_id);

CREATE TABLE lab_sessions (
  id SERIAL PRIMARY KEY,
  school_id INTEGER NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lab_key VARCHAR(255) NOT NULL,
  competency VARCHAR(255),
  completed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_lab_sessions_school_id ON lab_sessions(school_id);
CREATE INDEX idx_lab_sessions_student_id ON lab_sessions(student_id);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  school_id INTEGER REFERENCES schools(id) ON DELETE SET NULL,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(255) NOT NULL,
  resource VARCHAR(255),
  metadata JSONB,
  ip_address VARCHAR(64),
  created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_school_id ON audit_logs(school_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
