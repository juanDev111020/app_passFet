<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'foto')) {
                $table->string('foto')->nullable()->after('firma_digital');
            }
            if (!Schema::hasColumn('users', 'firma_orientacion')) {
                $table->string('firma_orientacion', 20)->default('horizontal')->nullable()->after('firma_digital');
            }
        });

        Schema::table('estudiantes', function (Blueprint $table) {
            if (!Schema::hasColumn('estudiantes', 'foto')) {
                $table->string('foto')->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'fecha_nacimiento')) {
                $table->date('fecha_nacimiento')->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'lugar_nacimiento')) {
                $table->string('lugar_nacimiento', 100)->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'estado_civil')) {
                $table->string('estado_civil', 50)->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'rh')) {
                $table->string('rh', 10)->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'contacto_emergencia')) {
                $table->string('contacto_emergencia', 150)->nullable();
            }
            if (!Schema::hasColumn('estudiantes', 'telefono_emergencia')) {
                $table->string('telefono_emergencia', 50)->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['foto', 'firma_orientacion']);
        });

        Schema::table('estudiantes', function (Blueprint $table) {
            $table->dropColumn([
                'foto',
                'fecha_nacimiento',
                'lugar_nacimiento',
                'estado_civil',
                'rh',
                'contacto_emergencia',
                'telefono_emergencia'
            ]);
        });
    }
};

