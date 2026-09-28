<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens;

    protected $table = 'users';

    protected $fillable = [
        'nombres', 'apellidos', 'numero_documento', 'email',
        'password', 'rol', 'activo', 'ultimo_acceso',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'activo'        => 'boolean',
            'ultimo_acceso' => 'datetime',
            'password'      => 'hashed',
        ];
    }
}