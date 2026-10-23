<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Pase extends Model
{
    protected $table = 'pases';

    protected $fillable = [
        'estudiante_id',
        'codigo_qr',
        'periodo_academico',
        'fecha_emision',
        'fecha_vencimiento',
        'estado',
        'ultimo_cambio_estado',
    ];

    protected function casts(): array
    {
        return [
            'fecha_emision'        => 'date',
            'fecha_vencimiento'    => 'date',
            'ultimo_cambio_estado' => 'datetime',
        ];
    }

    public function estudiante()
    {
        return $this->belongsTo(Estudiante::class);
    }
}
