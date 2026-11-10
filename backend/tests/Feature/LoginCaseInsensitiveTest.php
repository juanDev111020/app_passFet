<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class LoginCaseInsensitiveTest extends TestCase
{
    use DatabaseTransactions;

    public function test_login_ignora_mayusculas_en_correo(): void
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

        // Probar login con mayúsculas y mezclas (ej. ADMIN_12345@PassFet.EDU.co)
        $emailMayus = strtoupper($email);
        $response = $this->postJson('/api/auth/login', [
            'email'    => $emailMayus,
            'password' => 'Admin123*',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['token', 'user']);
        $this->assertEquals(strtolower($email), strtolower($response->json('user.email')));
    }
}
