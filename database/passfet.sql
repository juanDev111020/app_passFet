-- =============================================
-- PassFet v1.0 - Script de base de datos (PostgreSQL)
-- =============================================

-- 1. USUARIOS (admin y estudiantes)
CREATE TABLE users (
    id                BIGSERIAL PRIMARY KEY,
    nombres           VARCHAR(100) NOT NULL,
    apellidos         VARCHAR(100) NOT NULL,
    numero_documento  VARCHAR(20)  NOT NULL UNIQUE,
    email             VARCHAR(150) NOT NULL UNIQUE,
    password          VARCHAR(255) NOT NULL,
    rol               VARCHAR(20)  NOT NULL DEFAULT 'estudiante' CHECK (rol IN ('admin','estudiante')),
    activo            BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso     TIMESTAMP NULL,
    remember_token    VARCHAR(100) NULL,
    created_at        TIMESTAMP NULL,
    updated_at        TIMESTAMP NULL
);

-- 2. PROGRAMAS ACADÉMICOS
CREATE TABLE programas (
    id          BIGSERIAL PRIMARY KEY,
    codigo      VARCHAR(20)  NOT NULL UNIQUE,
    nombre      VARCHAR(150) NOT NULL,
    activo      BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMP NULL,
    updated_at  TIMESTAMP NULL
);

-- 3. ESTUDIANTES (1 a 1 con users)
CREATE TABLE estudiantes (
    id                 BIGSERIAL PRIMARY KEY,
    user_id            BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    programa_id        BIGINT NOT NULL REFERENCES programas(id),
    codigo_estudiantil VARCHAR(20) NOT NULL UNIQUE,
    semestre           SMALLINT NOT NULL CHECK (semestre BETWEEN 1 AND 12),
    telefono           VARCHAR(20) NULL,
    created_at         TIMESTAMP NULL,
    updated_at         TIMESTAMP NULL
);

-- 4. PASES (1 estudiante tiene N pases)
CREATE TABLE pases (
    id                BIGSERIAL PRIMARY KEY,
    estudiante_id     BIGINT NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
    codigo_qr         UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    periodo_academico VARCHAR(10) NOT NULL,
    fecha_emision     DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    estado            VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','vencido','suspendido','anulado')),
    created_at        TIMESTAMP NULL,
    updated_at        TIMESTAMP NULL,
    CHECK (fecha_vencimiento >= fecha_emision)
);

-- 5. VALIDACIONES DEL PASE
CREATE TABLE validaciones_pase (
    id           BIGSERIAL PRIMARY KEY,
    pase_id      BIGINT NOT NULL REFERENCES pases(id) ON DELETE CASCADE,
    validado_por BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    fecha_hora   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resultado    VARCHAR(20) NOT NULL CHECK (resultado IN ('aprobado','rechazado')),
    punto_acceso VARCHAR(100) NULL,
    created_at   TIMESTAMP NULL,
    updated_at   TIMESTAMP NULL
);

-- 6. TOKENS DE SESIÓN (Laravel Sanctum)
CREATE TABLE personal_access_tokens (
    id             BIGSERIAL PRIMARY KEY,
    tokenable_type VARCHAR(255) NOT NULL,
    tokenable_id   BIGINT NOT NULL,
    name           TEXT NOT NULL,
    token          VARCHAR(64) NOT NULL UNIQUE,
    abilities      TEXT NULL,
    last_used_at   TIMESTAMP NULL,
    expires_at     TIMESTAMP NULL,
    created_at     TIMESTAMP NULL,
    updated_at     TIMESTAMP NULL
);
CREATE INDEX pat_tokenable_index ON personal_access_tokens (tokenable_type, tokenable_id);

-- DATOS DE PRUEBA
-- Claves: admin -> Admin123*   estudiante -> Estudiante123*
INSERT INTO programas (codigo, nombre, created_at, updated_at)
VALUES ('ISW', 'Ingeniería de Software', NOW(), NOW());

INSERT INTO users (nombres, apellidos, numero_documento, email, password, rol, created_at, updated_at) VALUES
('Admin', 'PassFet', '1000000001', 'admin@passfet.edu.co',
 '$2y$12$EHajTZt27QJF1LssQpQTh.VVOx1Bx2RIcK4Y9Xp7zSGyKfA3sj2aq', 'admin', NOW(), NOW()),
('Laura', 'Gómez', '1000000002', 'estudiante@passfet.edu.co',
 '$2y$12$wrds.OD2uwPHGdemgwId6eepILJNL4ytv40SoNPeKskRh9qpTxEoa', 'estudiante', NOW(), NOW());

INSERT INTO estudiantes (user_id, programa_id, codigo_estudiantil, semestre, created_at, updated_at)
VALUES (2, 1, '2026100001', 5, NOW(), NOW());

INSERT INTO pases (estudiante_id, periodo_academico, fecha_emision, fecha_vencimiento, created_at, updated_at)
VALUES (1, '2026-2', '2026-08-01', '2026-12-15', NOW(), NOW());