<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class LoginExactCredencialesTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_rechaza_credenciales_en_mayuscula_si_fueron_registradas_en_minuscula(): void
    {
        $unique = (string) rand(10000, 99999);
        $email = 'admin_' . $unique . '@passfet.edu.co';

        User::create([
            'nombres'          => 'Admin',
            'apellidos'        => 'Test',
            'email'            => $email,
            'password'         => bcrypt('Admin123*'),
            'numero_documento' => '10' . $unique,
            'rol'              => 'admin',
            'activo'           => true,
        ]);

        // 1. Probar login con mayúsculas: debe ser rechazado con 401
        $emailMayus = strtoupper($email);
        $responseError = $this->postJson('/api/auth/login', [
            'email'    => $emailMayus,
            'password' => 'Admin123*',
        ]);

        $responseError->assertStatus(401);
        $responseError->assertJson(['message' => 'Credenciales incorrectas.']);

        // 2. Probar login con minúsculas exactas: debe ser exitoso (200)
        $responseOk = $this->postJson('/api/auth/login', [
            'email'    => $email,
            'password' => 'Admin123*',
        ]);

        $responseOk->assertStatus(200);
        $responseOk->assertJsonStructure(['token', 'user']);
    }
}
