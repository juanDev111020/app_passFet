<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Empresario;
use App\Models\Estudiante;
use App\Models\Pasantia;
use App\Models\FormatoAsistencia;
use Illuminate\Support\Facades\Hash;

class Acta005Seeder extends Seeder
{
    public function run(): void
    {
        // 1. Crear usuario Empresario
        $userEmpresario = User::firstOrCreate(
            ['email' => 'empresario@empresa.com'],
            [
                'nombres' => 'Carlos',
                'apellidos' => 'Mendoza',
                'numero_documento' => '900123456',
                'password' => Hash::make('Empresario123*'),
                'rol' => 'empresario',
                'activo' => true
            ]
        );

        $empresario = Empresario::firstOrCreate(
            ['user_id' => $userEmpresario->id],
            [
                'empresa' => 'Tech Solutions FET S.A.S',
                'nit' => '900.123.456-7',
                'cargo' => 'Gerente de TI / Supervisor',
                'telefono' => '3109876543',
                'direccion' => 'Calle 100 # 15-20, Neiva'
            ]
        );

        // 2. Asociar pasantía con el estudiante existente (Laura Gómez)
        $estudiante = Estudiante::first();
        if ($estudiante) {
            $pasantia = Pasantia::firstOrCreate(
                [
                    'estudiante_id' => $estudiante->id,
                    'empresario_id' => $empresario->id,
                ],
                [
                    'cargo_pasantia' => 'Desarrollador Junior Fullstack',
                    'fecha_inicio' => now()->subDays(15),
                    'fecha_fin' => now()->addMonths(5),
                    'estado' => 'activa',
                ]
            );

            // 3. Crear formato de asistencia inicial para demostración de check y firma
            FormatoAsistencia::firstOrCreate(
                [
                    'pasantia_id' => $pasantia->id,
                    'fecha_registro' => now()->subDays(2),
                ],
                [
                    'horas_cumplidas' => 8,
                    'actividades_realizadas' => 'Levantamiento de requerimientos y maquetación de módulos en React.',
                    'check_habilitado' => false,
                    'estado' => 'pendiente',
                ]
            );
        }
    }
}
