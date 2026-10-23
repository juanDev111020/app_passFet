<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Campos adicionales para construir la Hoja de Vida desde la plataforma
        Schema::table('estudiantes', function (Blueprint $table) {
            foreach (['direccion', 'ciudad', 'linkedin', 'idiomas'] as $col) {
                if (! Schema::hasColumn('estudiantes', $col)) {
                    $table->string($col, 150)->nullable();
                }
            }
            if (! Schema::hasColumn('estudiantes', 'formacion_complementaria')) {
                $table->text('formacion_complementaria')->nullable();
            }
        });

        // El pase ahora representa disponibilidad para pasantías: habilitado / inhabilitado
        DB::statement('ALTER TABLE pases DROP CONSTRAINT IF EXISTS pases_estado_check');
        DB::statement("UPDATE pases SET estado = CASE WHEN lower(estado) IN ('activo','habilitado') THEN 'habilitado' ELSE 'inhabilitado' END");
        DB::statement("ALTER TABLE pases ALTER COLUMN estado SET DEFAULT 'habilitado'");
        DB::statement("ALTER TABLE pases ADD CONSTRAINT pases_estado_check CHECK (estado IN ('habilitado','inhabilitado'))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE pases DROP CONSTRAINT IF EXISTS pases_estado_check');
        DB::statement("UPDATE pases SET estado = CASE WHEN estado = 'habilitado' THEN 'activo' ELSE 'suspendido' END");
        DB::statement("ALTER TABLE pases ALTER COLUMN estado SET DEFAULT 'activo'");
        DB::statement("ALTER TABLE pases ADD CONSTRAINT pases_estado_check CHECK (estado IN ('activo','vencido','suspendido','anulado'))");

        Schema::table('estudiantes', function (Blueprint $table) {
            $table->dropColumn(['direccion', 'ciudad', 'linkedin', 'idiomas', 'formacion_complementaria']);
        });
    }
};
