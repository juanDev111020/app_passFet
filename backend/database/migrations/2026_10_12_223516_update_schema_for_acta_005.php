<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Modificar restricción de rol en users para permitir 'empresario'
        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_rol_check CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'estudiante'::character varying, 'empresario'::character varying]::text[]))");

        // 2. Agregar campos a users
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'firma_digital')) {
                $table->string('firma_digital')->nullable()->after('activo');
            }
        });

        // 3. Agregar campos de perfil profesional a estudiantes
        Schema::table('estudiantes', function (Blueprint $table) {
            if (!Schema::hasColumn('estudiantes', 'hoja_vida_pdf')) {
                $table->string('hoja_vida_pdf')->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'resumen_profesional')) {
                $table->text('resumen_profesional')->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'habilidades')) {
                $table->text('habilidades')->nullable();
            }
        });

        // 4. Agregar campo ultimo_cambio_estado a pases para regla de negocio de 1 día (RF08)
        Schema::table('pases', function (Blueprint $table) {
            if (!Schema::hasColumn('pases', 'ultimo_cambio_estado')) {
                $table->timestamp('ultimo_cambio_estado')->nullable();
            }
        });

        // 5. Tabla de Empresarios
        if (!Schema::hasTable('empresarios')) {
            Schema::create('empresarios', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
                $table->string('empresa', 150);
                $table->string('nit', 30)->nullable();
                $table->string('cargo', 100)->nullable();
                $table->string('telefono', 30)->nullable();
                $table->string('direccion', 150)->nullable();
                $table->string('firma_imagen')->nullable();
                $table->timestamps();
            });
        }

        // 6. Tabla de Experiencias Universitarias (Semilleros, proyectos, etc. - RF05)
        if (!Schema::hasTable('experiencias')) {
            Schema::create('experiencias', function (Blueprint $table) {
                $table->id();
                $table->foreignId('estudiante_id')->constrained('estudiantes')->onDelete('cascade');
                $table->string('titulo', 150);
                $table->enum('tipo', ['semillero', 'proyecto_aplicacion', 'laboral', 'otro'])->default('semillero');
                $table->string('entidad', 150)->nullable();
                $table->text('descripcion')->nullable();
                $table->date('fecha_inicio')->nullable();
                $table->date('fecha_fin')->nullable();
                $table->timestamps();
            });
        }

        // 7. Tabla de Evidencias (Archivos / Imágenes - RF05)
        if (!Schema::hasTable('evidencias_archivos')) {
            Schema::create('evidencias_archivos', function (Blueprint $table) {
                $table->id();
                $table->foreignId('experiencia_id')->constrained('experiencias')->onDelete('cascade');
                $table->string('archivo_url');
                $table->string('nombre_original');
                $table->string('tipo_mime', 50)->nullable();
                $table->timestamps();
            });
        }

        // 8. Tabla de Pasantías Vinculadas
        if (!Schema::hasTable('pasantias')) {
            Schema::create('pasantias', function (Blueprint $table) {
                $table->id();
                $table->foreignId('estudiante_id')->constrained('estudiantes')->onDelete('cascade');
                $table->foreignId('empresario_id')->constrained('empresarios')->onDelete('cascade');
                $table->string('cargo_pasantia', 100)->nullable();
                $table->date('fecha_inicio');
                $table->date('fecha_fin')->nullable();
                $table->enum('estado', ['activa', 'finalizada', 'cancelada'])->default('activa');
                $table->timestamps();
            });
        }

        // 9. Tabla de Formatos de Evidencia de Asistencia a Pasantías (RF07)
        if (!Schema::hasTable('formatos_asistencia')) {
            Schema::create('formatos_asistencia', function (Blueprint $table) {
                $table->id();
                $table->foreignId('pasantia_id')->constrained('pasantias')->onDelete('cascade');
                $table->date('fecha_registro');
                $table->smallInteger('horas_cumplidas');
                $table->text('actividades_realizadas');
                $table->boolean('check_habilitado')->default(false); // Check de habilitación del empresario
                $table->string('firma_empresario_url')->nullable(); // Foto de firma del empresario
                $table->timestamp('fecha_firma')->nullable();
                $table->text('observaciones')->nullable();
                $table->enum('estado', ['pendiente', 'aprobado', 'rechazado'])->default('pendiente');
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('formatos_asistencia');
        Schema::dropIfExists('pasantias');
        Schema::dropIfExists('evidencias_archivos');
        Schema::dropIfExists('experiencias');
        Schema::dropIfExists('empresarios');

        Schema::table('pases', function (Blueprint $table) {
            $table->dropColumn('ultimo_cambio_estado');
        });

        Schema::table('estudiantes', function (Blueprint $table) {
            $table->dropColumn(['hoja_vida_pdf', 'resumen_profesional', 'habilidades']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('firma_digital');
        });

        DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_rol_check");
        DB::statement("ALTER TABLE users ADD CONSTRAINT users_rol_check CHECK (rol::text = ANY (ARRAY['admin'::character varying, 'estudiante'::character varying]::text[]))");
    }
};
