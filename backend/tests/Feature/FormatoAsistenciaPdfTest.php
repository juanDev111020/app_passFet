<?php

namespace Tests\Feature;

use App\Models\Empresario;
use App\Models\Estudiante;
use App\Models\Pasantia;
use App\Models\Pase;
use App\Models\Programa;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Illuminate\Support\Str;
use Tests\TestCase;

class FormatoAsistenciaPdfTest extends TestCase
{
    use DatabaseTransactions;

    public function test_formato_asistencia_muestra_empresa_correcta_y_periodo_dinamico(): void
    {
        $unique = (string) rand(10000, 99999);

        // Programa
        $programa = Programa::firstOrCreate(
            ['codigo' => 'PROG-TEST-' . $unique],
            ['nombre' => 'Ingeniería de Software Test']
        );

        // Estudiante
        $userEst = User::create([
            'nombres'          => 'Estudiante',
            'apellidos'        => 'Prueba ' . $unique,
            'email'            => 'estudiante_' . $unique . '@passfet.edu.co',
            'password'         => bcrypt('Password123*'),
            'numero_documento' => '10' . $unique,
            'rol'              => 'estudiante',
            'activo'           => true,
        ]);
        $estudiante = Estudiante::create([
            'user_id'            => $userEst->id,
            'programa_id'        => $programa->id,
            'codigo_estudiantil' => 'COD' . $unique,
            'semestre'           => 7,
        ]);
        Pase::create([
            'estudiante_id'     => $estudiante->id,
            'codigo_qr'         => (string) Str::uuid(),
            'periodo_academico' => '2026-2',
            'fecha_emision'     => now(),
            'fecha_vencimiento' => now()->addMonths(6),
            'estado'            => 'habilitado',
        ]);

        // Empresario
        $userEmp = User::create([
            'nombres'          => 'Carlos',
            'apellidos'        => 'Mendoza ' . $unique,
            'email'            => 'empresario_' . $unique . '@empresa.com',
            'password'         => bcrypt('Password123*'),
            'numero_documento' => '90' . $unique,
            'rol'              => 'empresario',
            'activo'           => true,
        ]);
        $empresario = Empresario::create([
            'user_id'   => $userEmp->id,
            'empresa'   => 'Tech Solutions FET S.A.S',
            'nit'       => '900123456',
            'cargo'     => 'Gerente de TI / Supervisor',
            'telefono'  => '3001234567',
            'direccion' => 'Calle 10 # 5-20',
        ]);

        // Pasantia
        $pasantia = Pasantia::create([
            'estudiante_id'  => $estudiante->id,
            'empresario_id'  => $empresario->id,
            'cargo_pasantia' => 'Desarrollador Junior Fullstack',
            'fecha_inicio'   => now()->subMonth(),
            'fecha_fin'      => now()->addMonths(5),
            'estado'         => 'activa',
        ]);

        // Petición autenticado como empresario
        $response = $this->actingAs($userEmp, 'sanctum')
            ->get("/api/pasantias/{$pasantia->id}/asistencia-pdf");

        $response->assertStatus(200);
        $response->assertHeader('content-type', 'application/pdf');

        // Renderizado directo de la vista para verificar campos de texto HTML
        $view = view('documentos.formato_asistencia', [
            'pasantia'              => $pasantia->load('estudiante.user', 'estudiante.pase', 'estudiante.programa', 'empresario.user', 'formatosAsistencia'),
            'estudiante'            => $estudiante,
            'empresario'            => $empresario,
            'asistencias'           => collect([]),
            'totalHoras'            => 0,
            'logoBase64'            => null,
            'firmaEstudianteBase64' => null,
            'firmaEmpresarioBase64' => null,
            'firmaDocenteBase64'    => null,
            'docenteNombre'         => 'Docente Tutor FET',
            'periodo'               => $estudiante->pase->periodo_academico,
        ])->render();

        // 1. Nombre de la empresa debe ser Tech Solutions FET S.A.S y no Carlos
        $this->assertStringContainsString('Tech Solutions FET S.A.S', $view);
        $this->assertStringContainsString('2026-2', $view);

        // 2. Firma del supervisor debe contener el nombre completo de Carlos Mendoza y el cargo
        $this->assertStringContainsString('Carlos Mendoza ' . $unique, $view);
        $this->assertStringContainsString('Gerente de TI / Supervisor', $view);
    }
}
