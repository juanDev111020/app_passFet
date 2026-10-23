<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Estudiante extends Model
{
    protected $table = 'estudiantes';

    protected $fillable = [
        'user_id',
        'programa_id',
        'codigo_estudiantil',
        'semestre',
        'telefono',
        'hoja_vida_pdf',
        'resumen_profesional',
        'habilidades',
        'direccion',
        'ciudad',
        'linkedin',
        'idiomas',
        'formacion_complementaria',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function programa()
    {
        return $this->belongsTo(Programa::class);
    }

    public function pase()
    {
        return $this->hasOne(Pase::class);
    }

    public function experiencias()
    {
        return $this->hasMany(Experiencia::class);
    }

    public function pasantias()
    {
        return $this->hasMany(Pasantia::class);
    }
}
