<?php

namespace Tests\Feature;

use App\Models\Estudiante;
use App\Models\Pase;
use App\Models\Programa;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class PaseRegla24HorasTest extends TestCase
{
    use DatabaseTransactions;

    protected User $admin;
    protected Estudiante $estudiante;
    protected Pase $pase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin_test@fet.edu.co'],
            [
                'nombres' => 'Admin',
                'apellidos' => 'Prueba',
                'numero_documento' => '999999999',
                'password' => bcrypt('password123'),
                'rol' => 'admin',
                'activo' => true,
            ]
        );

        $programa = Programa::firstOrCreate(
            ['nombre' => 'Ingeniería de Software'],
            ['codigo' => 'ISOF', 'facultad' => 'Ingeniería', 'activo' => true]
        );

        $userEstudiante = User::firstOrCreate(
            ['email' => 'estudiante_test@fet.edu.co'],
            [
                'nombres' => 'Laura',
                'apellidos' => 'Gómez',
                'numero_documento' => '888888888',
                'password' => bcrypt('password123'),
                'rol' => 'estudiante',
                'activo' => true,
            ]
        );

        $this->estudiante = Estudiante::firstOrCreate(
            ['user_id' => $userEstudiante->id],
            [
                'programa_id' => $programa->id,
                'codigo_estudiantil' => 'EST-TEST-01',
                'semestre' => 7,
            ]
        );

        $this->pase = Pase::firstOrCreate(
            ['estudiante_id' => $this->estudiante->id],
            [
                'codigo_qr' => (string) \Illuminate\Support\Str::uuid(),
                'periodo_academico' => '2026-1',
                'fecha_emision' => now()->toDateString(),
                'fecha_vencimiento' => now()->addMonths(6)->toDateString(),
                'estado' => 'habilitado',
                'ultimo_cambio_estado' => null,
            ]
        );
    }

    /**
     * CP-23: Si han pasado menos de 24 horas, el cambio se bloquea y muestra horas enteras sin decimales.
     */
    public function test_bloqueo_regla_24_horas_con_horas_enteras(): void
    {
        // 1. Simular cambio hace 1 minuto
        $this->pase->update(['ultimo_cambio_estado' => Carbon::now()->subMinutes(1)]);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/estudiantes/{$this->estudiante->id}/toggle-pase");

        $response->assertStatus(422)
            ->assertJson([
                'bloqueado_por_regla' => true,
                'horas_restantes' => 24,
            ]);

        $mensaje = $response->json('message');
        $this->assertStringContainsString('Faltan 24 hora(s)', $mensaje);
        $this->assertStringNotContainsString('.', (string)$response->json('horas_restantes'));

        // 2. Simular cambio hace 5 horas
        $this->pase->update(['ultimo_cambio_estado' => Carbon::now()->subHours(5)]);

        $response5 = $this->actingAs($this->admin)
            ->patchJson("/api/estudiantes/{$this->estudiante->id}/toggle-pase");

        $response5->assertStatus(422)
            ->assertJson([
                'bloqueado_por_regla' => true,
                'horas_restantes' => 19,
            ]);

        $this->assertStringContainsString('Faltan 19 hora(s)', $response5->json('message'));
    }

    /**
     * CP-24: Pasadas 24 horas o más (e.g. 72 horas / 3 días), el cambio es permitido exitosamente.
     */
    public function test_permite_cambio_despues_de_24_horas_o_3_dias(): void
    {
        // Simular que pasaron 3 días (72 horas)
        $this->pase->update([
            'estado' => 'inhabilitado',
            'ultimo_cambio_estado' => Carbon::now()->subDays(3),
        ]);

        $response = $this->actingAs($this->admin)
            ->patchJson("/api/estudiantes/{$this->estudiante->id}/toggle-pase");

        $response->assertStatus(200)
            ->assertJson([
                'estado' => 'habilitado',
                'message' => 'Disponibilidad del pase actualizada con éxito.',
            ]);

        $this->pase->refresh();
        $this->assertEquals('habilitado', $this->pase->estado);
    }
}
