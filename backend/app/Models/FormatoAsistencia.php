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
        'check_docente',
        'firma_empresario_url',
        'firma_docente_url',
        'fecha_firma',
        'fecha_firma_docente',
        'observaciones',
        'estado',
    ];

    protected function casts(): array
    {
        return [
            'check_habilitado'    => 'boolean',
            'check_docente'       => 'boolean',
            'fecha_registro'      => 'date:Y-m-d',
            'fecha_firma'         => 'datetime',
            'fecha_firma_docente' => 'datetime',
        ];
    }

    public function pasantia()
    {
        return $this->belongsTo(Pasantia::class);
    }
}
