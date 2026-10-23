<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pasantia extends Model
{
    protected $table = 'pasantias';

    protected $fillable = [
        'estudiante_id',
        'empresario_id',
        'cargo_pasantia',
        'fecha_inicio',
        'fecha_fin',
        'estado',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function empresario()
    {
        return $this->belongsTo(Empresario::class);
    }

    public function formatosAsistencia()
    {
        return $this->hasMany(FormatoAsistencia::class);
    }
}
