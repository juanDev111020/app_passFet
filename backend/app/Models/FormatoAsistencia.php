<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FormatoAsistencia extends Model
{
    protected $table = 'formatos_asistencia';

    protected $fillable = [
        'pasantia_id',
        'semana',
        'fecha_registro',
        'horas_cumplidas',
        'actividades_realizadas',
        'evidencia_url',
        'check_habilitado',
        'firma_empresario_url',
        'fecha_firma',
        'observaciones',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'check_habilitado' => 'boolean',
            'fecha_registro'   => 'date',
            'fecha_firma'      => 'datetime',
        ];
    }

    public function pasantia()
    {
        return $this->belongsTo(Pasantia::class);
    }
}
