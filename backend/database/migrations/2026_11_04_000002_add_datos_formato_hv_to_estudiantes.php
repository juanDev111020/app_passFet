<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estudiantes', function (Blueprint $table) {
            if (!Schema::hasColumn('estudiantes', 'datos_formato_hv')) {
                $table->json('datos_formato_hv')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('estudiantes', function (Blueprint $table) {
            $table->dropColumn('datos_formato_hv');
        });
    }
};

