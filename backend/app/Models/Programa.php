<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Programa extends Model
{
    protected $table = 'programas';

    protected $fillable = [
        'codigo',
        'nombre',
        'activo'
    ];

    public function estudiantes()
    {
        return $this->hasMany(Estudiante::class);
    }
}
