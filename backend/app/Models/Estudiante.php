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
        'foto',
        'fecha_nacimiento',
        'lugar_nacimiento',
        'estado_civil',
        'rh',
        'contacto_emergencia',
        'telefono_emergencia',
        'hoja_vida_pdf',
        'resumen_profesional',
        'habilidades',
        'direccion',
        'ciudad',
        'linkedin',
        'idiomas',
        'formacion_complementaria',
        'datos_formato_hv',
    ];

    protected function casts(): array
    {
        return [
            'datos_formato_hv' => 'array',
        ];
    }

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
