<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('formatos_asistencia', function (Blueprint $table) {
            if (!Schema::hasColumn('formatos_asistencia', 'check_docente')) {
                $table->boolean('check_docente')->default(false)->after('check_habilitado');
            }
            if (!Schema::hasColumn('formatos_asistencia', 'firma_docente_url')) {
                $table->string('firma_docente_url')->nullable()->after('firma_empresario_url');
            }
            if (!Schema::hasColumn('formatos_asistencia', 'fecha_firma_docente')) {
                $table->timestamp('fecha_firma_docente')->nullable()->after('fecha_firma');
            }
        });
    }

    public function down(): void
    {
        Schema::table('formatos_asistencia', function (Blueprint $table) {
            if (Schema::hasColumn('formatos_asistencia', 'check_docente')) {
                $table->dropColumn('check_docente');
            }
            if (Schema::hasColumn('formatos_asistencia', 'firma_docente_url')) {
                $table->dropColumn('firma_docente_url');
            }
            if (Schema::hasColumn('formatos_asistencia', 'fecha_firma_docente')) {
                $table->dropColumn('fecha_firma_docente');
            }
        });
    }
};
