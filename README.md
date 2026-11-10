# PassFet v1.0

Sistema de pase estudiantil digital.
Proyecto de Ingeniería de Software.

## Tecnologías
- Frontend: React + Vite
- Backend: Laravel 12 + Sanctum
- Base de datos: PostgreSQL

## Requisitos del Servidor (PHP)
- **PHP >= 8.2**
- **Extensiones requeridas de PHP** (en `php.ini` descomentar o activar):
  - `extension=pdo_pgsql` (Conexión a la base de datos PostgreSQL)
  - `extension=pgsql` (Driver PostgreSQL)
  - `extension=gd` (Requerida para procesamiento, compresión y rotación de firmas y fotos de hoja de vida)
  - `extension=fileinfo`
  - `extension=exif`

## Estructura
- `database/` — script SQL de la base de datos
- `backend/` — API REST en Laravel
- `frontend/` — aplicación React (SPA)

## Instalación

### Base de datos
Crear la BD `PassFet` en PostgreSQL y ejecutar `database/passfet.sql`.

### Backend
```
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan serve
```
Configurar en `.env` los datos de PostgreSQL (`DB_CONNECTION=pgsql`, `DB_DATABASE=PassFet`, etc.).

### Frontend
```
cd frontend
npm install
copy .env.example .env
npm run dev
```

## Equipo
- Jesús David Méndez — Frontend
- Juan Diego García — Backend