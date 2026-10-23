<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formatos_asistencia', function (Blueprint $table) {
            if (!Schema::hasColumn('formatos_asistencia', 'semana')) {
                $table->string('semana', 50)->nullable()->after('pasantia_id');
            }
            if (!Schema::hasColumn('formatos_asistencia', 'evidencia_url')) {
                $table->string('evidencia_url')->nullable()->after('actividades_realizadas');
            }
        });
    }

    public function down(): void
    {
        Schema::table('formatos_asistencia', function (Blueprint $table) {
            if (Schema::hasColumn('formatos_asistencia', 'semana')) {
                $table->dropColumn('semana');
            }
            if (Schema::hasColumn('formatos_asistencia', 'evidencia_url')) {
                $table->dropColumn('evidencia_url');
            }
        });
    }
};
