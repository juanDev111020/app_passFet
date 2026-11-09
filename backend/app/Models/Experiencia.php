<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Experiencia extends Model
{
    protected $table = 'experiencias';

    protected $fillable = [
        'estudiante_id',
        'titulo',
        'tipo',
        'entidad',
        'descripcion',
        'fecha_inicio',
        'fecha_fin',
    ];

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }

    public function evidencias()
    {
        return $this->hasMany(EvidenciaArchivo::class);
    }
}
