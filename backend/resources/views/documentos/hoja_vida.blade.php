<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Hoja de Vida - {{ $e->user->nombres }} {{ $e->user->apellidos }}</title>
    <style>
        @page { margin: 0; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 11px; color: #14201a; margin: 0; }
        .cabecera { background: #08940c; color: #fff; padding: 26px 40px; }
        .cabecera h1 { margin: 0; font-size: 22px; letter-spacing: -.3px; }
        .cabecera p { margin: 4px 0 0; font-size: 11px; opacity: .9; }
        .marca { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; opacity: .85; margin-bottom: 6px; }
        .contenido { padding: 24px 40px 30px; }
        h2 { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #067a0a;
             border-bottom: 2px solid #08940c; padding-bottom: 4px; margin: 20px 0 10px; }
        table.datos { width: 100%; border-collapse: collapse; }
        table.datos td { padding: 4px 0; vertical-align: top; }
        .etq { color: #5f6b64; font-size: 9px; text-transform: uppercase; display: block; }
        .val { font-weight: bold; }
        .exp { border: 1px solid #dfe6e1; border-left: 4px solid #08940c; padding: 8px 12px; margin-bottom: 8px; }
        .exp .t { font-weight: bold; font-size: 12px; }
        .exp .m { color: #5f6b64; font-size: 10px; margin: 2px 0 4px; }
        .tag { display: inline-block; background: #e8f8ea; color: #067a0a; padding: 2px 8px; border-radius: 8px; font-size: 10px; margin: 0 4px 4px 0; }
        .estado { display: inline-block; padding: 3px 10px; border-radius: 10px; font-size: 10px; font-weight: bold; }
        .ok { background: #e8f8ea; color: #067a0a; }
        .no { background: #fdecea; color: #d93025; }
        .firma { margin-top: 30px; }
        .firma img { height: 60px; }
        .firma .linea { border-top: 1px solid #14201a; width: 220px; padding-top: 4px; font-size: 10px; }
        .pie { position: fixed; bottom: 0; left: 0; right: 0; background: #f4f7f5; color: #5f6b64;
               font-size: 9px; text-align: center; padding: 8px; }
    </style>
</head>
<body>
@php
    $habilitado = in_array(strtolower((string) optional($e->pase)->estado), ['activo', 'habilitado']);
    $tipos = ['semillero' => 'Semillero de investigación', 'proyecto_aplicacion' => 'Proyecto de aplicación', 'laboral' => 'Experiencia laboral', 'otro' => 'Otro'];
@endphp

<div class="cabecera">
    <table style="width:100%; border-collapse:collapse;">
        <tr>
            <td style="vertical-align:middle;">
                <div class="marca">PassFet · Fundación Escuela Tecnológica</div>
                <h1 style="margin:2px 0 4px;">{{ $e->user->nombres }} {{ $e->user->apellidos }}</h1>
                <p style="margin:0;">{{ $e->programa->nombre ?? 'Programa académico' }} · Semestre {{ $e->semestre }}</p>
            </td>
            @if(!empty($logoBase64))
                <td style="width:110px; text-align:right; vertical-align:middle;">
                    <img src="{{ $logoBase64 }}" style="max-height:50px; background:#fff; padding:4px 6px; border-radius:4px;" alt="Logo FET">
                </td>
            @endif
        </tr>
    </table>
</div>

<div class="contenido">
    <h2>Datos personales</h2>
    <table class="datos">
        <tr>
            <td><span class="etq">Documento</span><span class="val">{{ $e->user->numero_documento }}</span></td>
            <td><span class="etq">Código estudiantil</span><span class="val">{{ $e->codigo_estudiantil }}</span></td>
            <td><span class="etq">Disponibilidad</span>
                <span class="estado {{ $habilitado ? 'ok' : 'no' }}">{{ $habilitado ? 'Habilitado para pasantía' : 'Inhabilitado' }}</span></td>
        </tr>
        <tr>
            <td><span class="etq">Correo</span><span class="val">{{ $e->user->email }}</span></td>
            <td><span class="etq">Teléfono</span><span class="val">{{ $e->telefono ?: '—' }}</span></td>
            <td><span class="etq">Ciudad</span><span class="val">{{ $e->ciudad ?: '—' }}</span></td>
        </tr>
        <tr>
            <td><span class="etq">Dirección</span><span class="val">{{ $e->direccion ?: '—' }}</span></td>
            <td colspan="2"><span class="etq">LinkedIn / Portafolio</span><span class="val">{{ $e->linkedin ?: '—' }}</span></td>
        </tr>
    </table>

    @if($e->resumen_profesional)
        <h2>Perfil profesional</h2>
        <p style="line-height:1.5; margin:0;">{{ $e->resumen_profesional }}</p>
    @endif

    @if($e->habilidades)
        <h2>Habilidades</h2>
        @foreach(preg_split('/[,\n]+/', $e->habilidades, -1, PREG_SPLIT_NO_EMPTY) as $h)
            <span class="tag">{{ trim($h) }}</span>
        @endforeach
    @endif

    @if($e->idiomas)
        <h2>Idiomas</h2>
        <p style="margin:0;">{{ $e->idiomas }}</p>
    @endif

    @if($e->formacion_complementaria)
        <h2>Formación complementaria</h2>
        <p style="line-height:1.5; margin:0; white-space: pre-line;">{{ $e->formacion_complementaria }}</p>
    @endif

    @if($e->experiencias->count())
        <h2>Experiencia universitaria</h2>
        @foreach($e->experiencias as $x)
            <div class="exp">
                <div class="t">{{ $x->titulo }}</div>
                <div class="m">
                    {{ $tipos[$x->tipo] ?? $x->tipo }}
                    @if($x->entidad) · {{ $x->entidad }} @endif
                    @if($x->fecha_inicio) · {{ \Carbon\Carbon::parse($x->fecha_inicio)->format('m/Y') }}
                        — {{ $x->fecha_fin ? \Carbon\Carbon::parse($x->fecha_fin)->format('m/Y') : 'Actualidad' }} @endif
                </div>
                @if($x->descripcion)<div>{{ $x->descripcion }}</div>@endif
                @if($x->evidencias->count())
                    <div class="m" style="margin-top:4px;">Evidencias adjuntas: {{ $x->evidencias->count() }}</div>
                @endif
            </div>
        @endforeach
    @endif

    @if($firma)
        <div class="firma">
            <img src="{{ $firma }}" alt="Firma">
            <div class="linea">{{ $e->user->nombres }} {{ $e->user->apellidos }}<br>C.C. {{ $e->user->numero_documento }}</div>
        </div>
    @endif
</div>

<div class="pie">Documento generado por PassFet · FET · {{ now()->format('d/m/Y H:i') }}</div>
</body>
</html>
