<?php

namespace Tests\Feature;

use App\Models\Empresario;
use App\Models\Estudiante;
use App\Models\FormatoAsistencia;
use App\Models\Pasantia;
use App\Models\Programa;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FormatoAsistenciaFechaTest extends TestCase
{
    use DatabaseTransactions;

    public function test_fecha_registro_se_serializa_en_formato_simple_y_no_iso_utc(): void
    {
        $unique = (string) rand(10000, 99999);

        $programa = Programa::firstOrCreate(
            ['codigo' => 'PROG-TEST-' . $unique],
            ['nombre' => 'Ingeniería Test']
        );

        $userEst = User::create([
            'nombres'          => 'Estudiante',
            'apellidos'        => 'Fecha',
            'email'            => 'est_' . $unique . '@passfet.edu.co',
            'password'         => bcrypt('Password123*'),
            'numero_documento' => '10' . $unique,
            'rol'              => 'estudiante',
            'activo'           => true,
        ]);
        $estudiante = Estudiante::create([
            'user_id'            => $userEst->id,
            'programa_id'        => $programa->id,
            'codigo_estudiantil' => 'COD' . $unique,
            'semestre'           => 6,
        ]);

        $userEmp = User::create([
            'nombres'          => 'Empresario',
            'apellidos'        => 'Fecha',
            'email'            => 'emp_' . $unique . '@empresa.com',
            'password'         => bcrypt('Password123*'),
            'numero_documento' => '90' . $unique,
            'rol'              => 'empresario',
            'activo'           => true,
        ]);
        $empresario = Empresario::create([
            'user_id' => $userEmp->id,
            'empresa' => 'Empresa Test ' . $unique,
            'nit'     => '900' . $unique,
        ]);

        $pasantia = Pasantia::create([
            'estudiante_id'  => $estudiante->id,
            'empresario_id'  => $empresario->id,
            'cargo_pasantia' => 'Pasante',
            'fecha_inicio'   => '2026-11-09',
            'estado'         => 'activa',
        ]);

        $formato = FormatoAsistencia::create([
            'pasantia_id'            => $pasantia->id,
            'semana'                 => 'Semana 1',
            'fecha_registro'         => '2026-11-09',
            'horas_cumplidas'        => 8,
            'actividades_realizadas' => 'Prueba de fecha',
            'estado'                 => 'pendiente',
        ]);

        $array = $formato->toArray();

        // Debe ser '2026-11-09' y no '2026-11-09T00:00:00.000000Z'
        $this->assertEquals('2026-11-09', $array['fecha_registro']);
        $this->assertStringNotContainsString('T00:00:00', $array['fecha_registro']);
    }
}

