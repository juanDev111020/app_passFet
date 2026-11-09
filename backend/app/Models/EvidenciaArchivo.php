<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvidenciaArchivo extends Model
{
    protected $table = 'evidencias_archivos';

    protected $fillable = [
        'experiencia_id',
        'archivo_url',
        'nombre_original',
        'tipo_mime',
    ];

    public function experiencia()
    {
        return $this->belongsTo(Experiencia::class);
    }
}
