<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Empresario extends Model
{
    protected $table = 'empresarios';

    protected $fillable = [
        'user_id',
        'empresa',
        'nit',
        'cargo',
        'telefono',
        'direccion',
        'firma_imagen',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function pasantias()
    {
        return $this->hasMany(Pasantia::class);
    }
}
