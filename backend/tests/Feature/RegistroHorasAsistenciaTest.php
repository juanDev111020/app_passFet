<?php

namespace Tests\Feature;

use App\Models\Empresario;
use App\Models\Estudiante;
use App\Models\Pasantia;
use App\Models\Pase;
use App\Models\Programa;
use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class RegistroHorasAsistenciaTest extends TestCase
{
    use DatabaseTransactions;

    protected User $userEstudiante;
    protected Estudiante $estudiante;
    protected Pasantia $pasantia;

    protected function setUp(): void
    {
        parent::setUp();

        $programa = Programa::firstOrCreate(
            ['nombre' => 'Ingeniería de Software'],
            ['codigo' => 'ISOF', 'facultad' => 'Ingeniería', 'activo' => true]
        );

        $this->userEstudiante = User::firstOrCreate(
            ['email' => 'estudiante_horas_test@fet.edu.co'],
            [
                'nombres' => 'Carlos',
                'apellidos' => 'Pérez',
                'numero_documento' => '777777777',
                'password' => bcrypt('password123'),
                'rol' => 'estudiante',
                'activo' => true,
            ]
        );

        $this->estudiante = Estudiante::firstOrCreate(
            ['user_id' => $this->userEstudiante->id],
            [
                'programa_id' => $programa->id,
                'codigo_estudiantil' => 'EST-HORAS-01',
                'semestre' => 8,
            ]
        );

        $userEmpresario = User::firstOrCreate(
            ['email' => 'empresa_horas_test@empresa.com'],
            [
                'nombres' => 'Supervisor',
                'apellidos' => 'Empresarial',
                'numero_documento' => '666666666',
                'password' => bcrypt('password123'),
                'rol' => 'empresario',
                'activo' => true,
            ]
        );

        $empresario = Empresario::firstOrCreate(
            ['user_id' => $userEmpresario->id],
            [
                'empresa' => 'Empresa Test',
                'cargo' => 'Gerente TI',
                'nit' => '900111222-3',
            ]
        );

        $this->pasantia = Pasantia::firstOrCreate(
            [
                'estudiante_id' => $this->estudiante->id,
                'empresario_id' => $empresario->id,
            ],
            [
                'cargo_pasantia' => 'Pasante de Desarrollo',
                'fecha_inicio' => now()->toDateString(),
                'estado' => 'activa',
            ]
        );
    }

    /**
     * CP-34: Registrar horas válidas hasta 42 horas semanales (e.g. 30 o 42 horas).
     */
    public function test_permite_registrar_hasta_42_horas_semanales(): void
    {
        $response = $this->actingAs($this->userEstudiante)
            ->postJson('/api/pasantias/asistencias', [
                'pasantia_id' => $this->pasantia->id,
                'semana' => 'Semana 1',
                'fecha_registro' => now()->toDateString(),
                'horas_cumplidas' => 30, // 30 horas semanales
                'actividades_realizadas' => 'Desarrollo de módulos del sistema PassFet.',
            ]);

        $response->assertStatus(201)
            ->assertJson([
                'asistencia' => [
                    'horas_cumplidas' => 30,
                    'semana' => 'Semana 1',
                ],
            ]);
    }

    /**
     * CP-34: Rechaza reportes con más de 42 horas o menos de 1 hora.
     */
    public function test_rechaza_horas_mayores_a_42_o_menores_a_1(): void
    {
        // Más de 42 horas
        $responseMayor = $this->actingAs($this->userEstudiante)
            ->postJson('/api/pasantias/asistencias', [
                'pasantia_id' => $this->pasantia->id,
                'semana' => 'Semana 2',
                'fecha_registro' => now()->toDateString(),
                'horas_cumplidas' => 45,
                'actividades_realizadas' => 'Actividades de prueba.',
            ]);

        $responseMayor->assertStatus(422)
            ->assertJsonValidationErrors(['horas_cumplidas']);

        $this->assertStringContainsString(
            'Las horas cumplidas deben estar entre 1 y 42 horas.',
            $responseMayor->json('errors.horas_cumplidas.0')
        );

        // Menor a 1 hora
        $responseMenor = $this->actingAs($this->userEstudiante)
            ->postJson('/api/pasantias/asistencias', [
                'pasantia_id' => $this->pasantia->id,
                'semana' => 'Semana 3',
                'fecha_registro' => now()->toDateString(),
                'horas_cumplidas' => 0,
                'actividades_realizadas' => 'Actividades de prueba.',
            ]);

        $responseMenor->assertStatus(422)
            ->assertJsonValidationErrors(['horas_cumplidas']);
    }
}

