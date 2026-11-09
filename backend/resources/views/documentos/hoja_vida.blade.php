<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Hoja de Vida Institucional - {{ $e->user->nombres }} {{ $e->user->apellidos }}</title>
    <style>
        @page {
            margin: 30mm 16mm 16mm 16mm;
            size: letter portrait;
        }
        body {
            font-family: DejaVu Sans, Arial, sans-serif;
            font-size: 8.5px;
            color: #000000;
            line-height: 1.35;
            margin: 0;
            padding: 0;
        }

        /* Cabecera Fija Repetitiva en Cada Página */
        .page-header {
            position: fixed;
            top: -24mm;
            left: 0;
            right: 0;
            height: 20mm;
        }
        .hdr-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #000000;
        }
        .hdr-table td {
            border: 1px solid #000000;
            padding: 3px 5px;
            vertical-align: middle;
        }
        .hdr-logo {
            width: 28%;
            text-align: center;
        }
        .hdr-logo img {
            max-height: 44px;
            max-width: 130px;
            display: inline-block;
        }
        .hdr-title {
            width: 44%;
            text-align: center;
            font-size: 10.5px;
            font-weight: bold;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .hdr-meta {
            width: 28%;
            font-size: 8px;
            line-height: 1.3;
        }

        /* Título Principal */
        .doc-title {
            text-align: center;
            color: #549e39;
            font-size: 15px;
            font-weight: bold;
            margin: 4px 0 6px;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        /* Foto Central 3x4 (Ubicada exactamente como en la plantilla oficial Word) */
        .foto-center-container {
            text-align: center;
            margin: 0 auto 8px;
        }
        .foto-box {
            width: 110px;
            height: 138px;
            border: 2px solid #648F59;
            background: #fafcfa;
            margin: 0 auto;
            text-align: center;
        }
        .foto-box table {
            width: 100%;
            height: 100%;
            border-collapse: collapse;
        }
        .foto-box td {
            text-align: center;
            vertical-align: middle;
            padding: 2px;
        }
        .foto-box img {
            max-width: 104px;
            max-height: 132px;
            display: inline-block;
            vertical-align: middle;
        }
        .foto-placeholder {
            color: #648F59;
            font-weight: bold;
            font-size: 9px;
            line-height: 1.4;
        }

        /* Encabezados de Sección (Heading 1) */
        .sec-h1 {
            background-color: #8ab833;
            color: #ffffff;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            padding: 3px 6px;
            margin: 10px 0 6px;
            letter-spacing: 0.5px;
        }

        /* Encabezados de Subsección (Heading 2) */
        .sec-h2 {
            background-color: #e5ebb0;
            border: 1px solid #d4dba0;
            color: #294e1c;
            font-size: 9px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 2.5px 5px;
            margin: 8px 0 4px;
        }

        .sec-h3 {
            color: #294e1c;
            font-weight: bold;
            font-size: 8.5px;
            margin: 5px 0 2px;
        }

        .campo-fila {
            margin-bottom: 3.5px;
            font-size: 8.5px;
            line-height: 1.4;
        }
        .campo-label {
            font-weight: bold;
            text-transform: uppercase;
            color: #000000;
        }
        .campo-val {
            color: #0a1f10;
            font-weight: 600;
        }
        .linea-blanco {
            color: #222222;
        }

        /* Tabla de Cursos y Diplomados */
        .tabla-cursos {
            width: 100%;
            border-collapse: collapse;
            margin: 4px 0 8px;
            font-size: 7.5px;
        }
        .tabla-cursos th {
            border: 1px solid #000000;
            background: #f0f4ec;
            color: #000000;
            padding: 3px 4px;
            text-align: center;
            font-weight: bold;
        }
        .tabla-cursos td {
            border: 1px solid #000000;
            padding: 3px 4px;
            height: 14px;
        }

        /* Bloques de Experiencia Laboral */
        .exp-bloque {
            border-bottom: 1px dashed #b8c4ba;
            padding-bottom: 6px;
            margin-bottom: 6px;
            page-break-inside: avoid;
        }

        /* Firma */
        .firma-container {
            width: 280px;
            margin: 25px auto 0;
            text-align: center;
            page-break-inside: avoid;
        }
        .firma-box-img {
            height: 75px;
            text-align: center;
            vertical-align: bottom;
            margin-bottom: 4px;
        }
        .firma-box-img img {
            max-height: 70px;
            max-width: 250px;
            display: inline-block;
            vertical-align: bottom;
        }
        .firma-linea {
            border-top: 1.5px solid #000000;
            padding-top: 4px;
            font-weight: bold;
            font-size: 9.5px;
            text-align: center;
            text-transform: uppercase;
        }
        .firma-datos {
            font-size: 8.5px;
            text-align: center;
            margin-top: 2px;
        }

        .salto-pagina {
            page-break-before: always;
        }
    </style>
</head>
<body>

@php
    $hv = $e->datos_formato_hv ?? [];

    // Helper para retornar valor del estudiante o subrayado en blanco
    $getVal = function($arr, $key, $subKey = null, $lineaLongitud = 30) {
        $val = null;
        if ($subKey && isset($arr[$key][$subKey])) {
            $val = trim((string)$arr[$key][$subKey]);
        } elseif (!$subKey && isset($arr[$key])) {
            $val = trim((string)$arr[$key]);
        }
        if (!empty($val)) {
            return '<span class="campo-val">' . e($val) . '</span>';
        }
        return '<span class="linea-blanco">' . str_repeat('_', $lineaLongitud) . '</span>';
    };

    // Parseo de fecha de nacimiento si existe
    $diaNac = '  ';
    $mesNac = '  ';
    $anoNac = '    ';
    if ($e->fecha_nacimiento) {
        $fNac = \Carbon\Carbon::parse($e->fecha_nacimiento);
        $diaNac = $fNac->format('d');
        $mesNac = $fNac->format('m');
        $anoNac = $fNac->format('Y');
    }
@endphp

<!-- Cabecera Institucional Fija (Se repite en todas las páginas) -->
<div class="page-header">
    <table class="hdr-table">
        <tr>
            <td class="hdr-logo">
                @if(!empty($logoBase64))
                    <img src="{{ $logoBase64 }}" alt="Logo FET">
                @else
                    <strong style="color:#08940c; font-size:13px;">FET</strong>
                @endif
            </td>
            <td class="hdr-title">
                FORMATO HOJA DE VIDA
            </td>
            <td class="hdr-meta">
                <strong>CODIGO:</strong> PA-GTH-F-10<br>
                <strong>VERSION:</strong> 01<br>
                <strong>FECHA:</strong> 23/06/2018
            </td>
        </tr>
    </table>
</div>

<div class="doc-title">HOJA DE VIDA</div>

<!-- Foto 3x4 Centrada Símétrica (Ubicación Oficial) -->
<div class="foto-center-container">
    <div class="foto-box">
        <table>
            <tr>
                <td>
                    @if(!empty($foto))
                        <img src="{{ $foto }}" alt="Foto 3x4">
                    @else
                        <div class="foto-placeholder">
                            FOTO<br>3 x 4
                        </div>
                    @endif
                </td>
            </tr>
        </table>
    </div>
</div>

<!-- 1. DATOS PERSONALES -->
<div class="sec-h1">1. &nbsp; DATOS PERSONALES</div>

<div class="campo-fila"><span class="campo-label">NOMBRE:</span> <span class="campo-val">{{ $e->user->nombres }} {{ $e->user->apellidos }}</span></div>
<div class="campo-fila"><span class="campo-label">DOCUMENTO DE IDENTIDAD:</span> <span class="campo-val">{{ $e->user->numero_documento }}</span></div>
<div class="campo-fila"><span class="campo-label">FECHA DE NACIMIENTO:</span> ( {{ $diaNac }} ) ( {{ $mesNac }} ) ( {{ $anoNac }} ) &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span style="font-size:7.5px; color:#555;">Día &nbsp; Mes &nbsp; Año</span></div>
<div class="campo-fila"><span class="campo-label">LUGAR DE NACIMIENTO:</span> {!! !empty($e->lugar_nacimiento) ? '<span class="campo-val">'.e($e->lugar_nacimiento).'</span>' : '<span class="linea-blanco">____________________________________________________</span>' !!}</div>
<div class="campo-fila"><span class="campo-label">ESTADO CIVIL:</span> <span class="campo-val">{{ $e->estado_civil ?: 'Soltero(a)' }}</span></div>
<div class="campo-fila"><span class="campo-label">LUGAR DE RESIDENCIA:</span> <span class="campo-val">{{ $e->ciudad ?: 'Neiva, Huila' }}</span></div>
<div class="campo-fila"><span class="campo-label">DIRECCIÓN:</span> {!! !empty($e->direccion) ? '<span class="campo-val">'.e($e->direccion).'</span>' : '<span class="linea-blanco">____________________________________________________</span>' !!}</div>
<div class="campo-fila"><span class="campo-label">TELÉFONOS:</span> {!! !empty($e->telefono) ? '<span class="campo-val">'.e($e->telefono).'</span>' : '<span class="linea-blanco">____________________________________</span>' !!}</div>
<div class="campo-fila"><span class="campo-label">E-MAIL:</span> <span class="campo-val">{{ $e->user->email }}</span></div>
<div class="campo-fila"><span class="campo-label">R-H:</span> <span class="campo-val">{{ $e->rh ?: '—' }}</span></div>
<div class="campo-fila"><span class="campo-label">Persona de contacto en caso de emergencia:</span> {!! !empty($e->contacto_emergencia) ? '<span class="campo-val">'.e($e->contacto_emergencia).'</span>' : '<span class="linea-blanco">________________________________________</span>' !!} &nbsp; {!! !empty($e->telefono_emergencia) ? '<span class="campo-val">Tel: '.e($e->telefono_emergencia).'</span>' : '<span class="linea-blanco">Tel: ____________________</span>' !!}</div>

<!-- 2. FORMACIÓN ACADÉMICA -->
<div class="sec-h1">2. &nbsp; FORMACIÓN ACADÉMICA</div>

<div class="sec-h2">2.1 EDUCACIÓN SUPERIOR</div>

<div class="campo-fila"><span class="campo-label">Maestría:</span> {!! $getVal($hv, 'maestria', 'titulo', 50) !!}</div>
<div class="campo-fila"><span class="campo-label">Fecha de grado:</span> {!! $getVal($hv, 'maestria', 'fecha_grado', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Institución:</span> {!! $getVal($hv, 'maestria', 'institucion', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">País y ciudad:</span> {!! $getVal($hv, 'maestria', 'ciudad', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Título obtenido:</span> {!! $getVal($hv, 'maestria', 'titulo_obtenido', 38) !!}</div>

<div class="campo-fila" style="margin-top: 5px;"><span class="campo-label">Especialización:</span> {!! $getVal($hv, 'especializacion', 'titulo', 50) !!}</div>
<div class="campo-fila"><span class="campo-label">Fecha de grado:</span> {!! $getVal($hv, 'especializacion', 'fecha_grado', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Institución:</span> {!! $getVal($hv, 'especializacion', 'institucion', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">País y ciudad:</span> {!! $getVal($hv, 'especializacion', 'ciudad', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Título obtenido:</span> {!! $getVal($hv, 'especializacion', 'titulo_obtenido', 38) !!}</div>

<div class="campo-fila" style="margin-top: 5px;">
    <span class="campo-label">Pregrado:</span> 
    {!! !empty($hv['pregrado']['carrera']) ? '<span class="campo-val">'.e($hv['pregrado']['carrera']).'</span>' : '<span class="campo-val">'.e($e->programa->nombre ?? 'Pregrado Profesional').' (Semestre '.e($e->semestre).')</span>' !!}
</div>
<div class="campo-fila">
    <span class="campo-label">Fecha de grado:</span> {!! $getVal($hv, 'pregrado', 'fecha_grado', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; 
    <span class="campo-label">Institución:</span> {!! !empty($hv['pregrado']['institucion']) ? '<span class="campo-val">'.e($hv['pregrado']['institucion']).'</span>' : '<span class="campo-val">Fundación Escuela Tecnológica de Neiva - FET</span>' !!}
</div>
<div class="campo-fila">
    <span class="campo-label">País y ciudad:</span> {!! !empty($hv['pregrado']['ciudad']) ? '<span class="campo-val">'.e($hv['pregrado']['ciudad']).'</span>' : '<span class="campo-val">Neiva, Colombia</span>' !!} &nbsp;&nbsp;&nbsp;&nbsp; 
    <span class="campo-label">Título obtenido:</span> {!! $getVal($hv, 'pregrado', 'titulo_obtenido', 38) !!}
</div>

<div style="text-align: center; font-weight: bold; font-size: 8px; margin: 6px 0 3px; text-transform: uppercase;">
    Diplomados, cursos, seminarios y actualizaciones
</div>

<table class="tabla-cursos">
    <thead>
        <tr>
            <th style="width: 38%;">TEMA</th>
            <th style="width: 14%;">DURACIÓN</th>
            <th style="width: 14%;">FECHA</th>
            <th style="width: 20%;">INSTITUCIÓN</th>
            <th style="width: 14%;">MODALIDAD</th>
        </tr>
    </thead>
    <tbody>
        @php
            $cursos = $hv['cursos'] ?? [];
            if (empty($cursos) && !empty($e->formacion_complementaria)) {
                $lineas = array_filter(array_map('trim', explode("\n", $e->formacion_complementaria)));
                foreach ($lineas as $l) {
                    $cursos[] = ['tema' => $l, 'duracion' => 'Certificado', 'fecha' => '', 'institucion' => 'FET / Institucional', 'modalidad' => ''];
                }
            }
            $totalFilasCursos = max(12, count($cursos));
        @endphp
        @for($i = 0; $i < $totalFilasCursos; $i++)
            @php $c = $cursos[$i] ?? null; @endphp
            <tr>
                <td>{{ $c['tema'] ?? '' }}</td>
                <td style="text-align: center;">{{ $c['duracion'] ?? '' }}</td>
                <td style="text-align: center;">{{ $c['fecha'] ?? '' }}</td>
                <td>{{ $c['institucion'] ?? '' }}</td>
                <td style="text-align: center;">{{ $c['modalidad'] ?? '' }}</td>
            </tr>
        @endfor
    </tbody>
</table>

<div class="sec-h2">2.2 TÉCNICA Y TECNOLÓGICA</div>
<div class="campo-fila"><span class="campo-label">Tecnólogo:</span> {!! $getVal($hv, 'tecnologo', 'titulo', 60) !!}</div>
<div class="campo-fila"><span class="campo-label">Fecha de grado:</span> {!! $getVal($hv, 'tecnologo', 'fecha_grado', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Institución:</span> {!! $getVal($hv, 'tecnologo', 'institucion', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">País y ciudad:</span> {!! $getVal($hv, 'tecnologo', 'ciudad', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Título obtenido:</span> {!! $getVal($hv, 'tecnologo', 'titulo_obtenido', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">Modalidad de estudio:</span> {!! $getVal($hv, 'tecnologo', 'modalidad', 55) !!}</div>

<div class="campo-fila" style="margin-top: 5px;"><span class="campo-label">Técnico:</span> {!! $getVal($hv, 'tecnico', 'titulo', 60) !!}</div>
<div class="campo-fila"><span class="campo-label">Fecha de grado:</span> {!! $getVal($hv, 'tecnico', 'fecha_grado', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Institución:</span> {!! $getVal($hv, 'tecnico', 'institucion', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">País y ciudad:</span> {!! $getVal($hv, 'tecnico', 'ciudad', 20) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">Título obtenido:</span> {!! $getVal($hv, 'tecnico', 'titulo_obtenido', 38) !!}</div>
<div class="campo-fila"><span class="campo-label">Modalidad de estudio:</span> {!! $getVal($hv, 'tecnico', 'modalidad', 55) !!}</div>

<!-- 3. EXPERIENCIA LABORAL -->
<div class="sec-h1">3. &nbsp; EXPERIENCIA LABORAL</div>

@php
    $expsLaborales = $hv['experiencia_laboral'] ?? [];
    // Si no están en JSON pero están en la relación experiencias, mapearlas
    if (empty($expsLaborales)) {
        $labs = $e->experiencias->whereIn('tipo', ['laboral', 'otro'])->values();
        foreach ($labs as $idx => $lab) {
            $expsLaborales[$idx] = [
                'empresa' => $lab->entidad,
                'cargo' => $lab->titulo,
                'direccion' => $e->ciudad ?: 'Neiva',
                'telefono' => $e->telefono,
                'jefe' => 'Tutor Institucional',
                'dedicacion' => 'Tiempo parcial / Prácticas',
                'fecha_inicio_fin' => ($lab->fecha_inicio ? \Carbon\Carbon::parse($lab->fecha_inicio)->format('d/m/Y') : '—') . ' a ' . ($lab->fecha_fin ? \Carbon\Carbon::parse($lab->fecha_fin)->format('d/m/Y') : 'Actualidad'),
                'funciones' => $lab->descripcion,
            ];
        }
    }
@endphp

@for($b = 0; $b < 3; $b++)
    @php $exp = $expsLaborales[$b] ?? null; @endphp
    <div class="exp-bloque">
        <div class="campo-fila"><span class="campo-label">INSTITUCION/EMPRESA:</span> {!! !empty($exp['empresa']) ? '<span class="campo-val">'.e($exp['empresa']).'</span>' : '<span class="linea-blanco">____________________________________________________________________</span>' !!}</div>
        <div class="campo-fila"><span class="campo-label">NOMBRE DEL CARGO:</span> {!! !empty($exp['cargo']) ? '<span class="campo-val">'.e($exp['cargo']).'</span>' : '<span class="linea-blanco">____________________________________________________________________</span>' !!}</div>
        <div class="campo-fila"><span class="campo-label">DIRECCIÓN:</span> {!! !empty($exp['direccion']) ? '<span class="campo-val">'.e($exp['direccion']).'</span>' : '<span class="linea-blanco">___________________________________</span>' !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">TELÉFONOS:</span> {!! !empty($exp['telefono']) ? '<span class="campo-val">'.e($exp['telefono']).'</span>' : '<span class="linea-blanco">_______________________</span>' !!}</div>
        <div class="campo-fila"><span class="campo-label">NOMBRE DEL JEFE INMEDIATO:</span> {!! !empty($exp['jefe']) ? '<span class="campo-val">'.e($exp['jefe']).'</span>' : '<span class="linea-blanco">________________________</span>' !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">DEDICACION:</span> {!! !empty($exp['dedicacion']) ? '<span class="campo-val">'.e($exp['dedicacion']).'</span>' : '<span class="linea-blanco">______________________</span>' !!}</div>
        <div class="campo-fila"><span class="campo-label">FECHA DE INICIO Y TERMINACIÓN:</span> {!! !empty($exp['fecha_inicio_fin']) ? '<span class="campo-val">'.e($exp['fecha_inicio_fin']).'</span>' : '<span class="linea-blanco">_____________________________________________________</span>' !!}</div>
        <div class="campo-fila"><span class="campo-label">FUNCIONES:</span> {!! !empty($exp['funciones']) ? '<span class="campo-val">'.e($exp['funciones']).'</span>' : '<span class="linea-blanco">_________________________________________________________________________________________________________________________________________________________________</span>' !!}</div>
    </div>
@endfor

<!-- 4. EXPERIENCIA ACADÉMICA EN INVESTIGACTIVA -->
<div class="sec-h1">4. &nbsp; EXPERIENCIA ACADÉMICA EN INVESTIGACTIVA</div>

@php
    $sem = $e->experiencias->where('tipo', 'semillero')->first();
    $proy = $e->experiencias->where('tipo', 'proyecto_aplicacion')->first();
    $grupoNombre = !empty($hv['investigacion']['grupo_nombre']) ? $hv['investigacion']['grupo_nombre'] : ($sem?->titulo ? $sem->titulo . ($sem->entidad ? ' - ' . $sem->entidad : '') : null);
    $grupoTiempo = !empty($hv['investigacion']['grupo_tiempo']) ? $hv['investigacion']['grupo_tiempo'] : ($sem?->fecha_inicio ? \Carbon\Carbon::parse($sem->fecha_inicio)->format('m/Y') . ' a ' . ($sem->fecha_fin ? \Carbon\Carbon::parse($sem->fecha_fin)->format('m/Y') : 'Actualidad') : null);
    $proyDesc = !empty($hv['investigacion']['proyectos']) ? $hv['investigacion']['proyectos'] : ($proy ? $proy->titulo . ': ' . $proy->descripcion : null);
@endphp

<div class="sec-h2">4.1 PERTENENCIA A GRUPOS DE INVESTIGACIÓN</div>
<div class="campo-fila"><span class="campo-label">Nombre del grupo:</span> {!! !empty($grupoNombre) ? '<span class="campo-val">'.e($grupoNombre).'</span>' : '<span class="linea-blanco">_________________________________________________________________</span>' !!}</div>
<div class="campo-fila"><span class="campo-label">Tiempo de vinculación:</span> {!! !empty($grupoTiempo) ? '<span class="campo-val">'.e($grupoTiempo).'</span>' : '<span class="linea-blanco">___________________________________________________________</span>' !!}</div>

<div class="sec-h2">4.2 PROYECTOS DE INVESTIGACIÓN DESARROLLADOS</div>
<div class="campo-fila">{!! !empty($proyDesc) ? '<span class="campo-val">'.e($proyDesc).'</span>' : '<span class="linea-blanco">________________________________________________________________________________________________</span>' !!}</div>

<div class="sec-h2">4.3 DIRECCIÓN / TUTORÍAS CONCLUIDAS</div>
<div class="sec-h3">Tutorías trabajos de culminación de posgrado</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'tutorias_posgrado', 90) !!}</div>
<div class="sec-h3">Tutorías trabajos de culminación de pregrado</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'tutorias_pregrado', 90) !!}</div>

<div class="sec-h2">4.4 PAR EVALUADOR / JURADO EN COMITÉS DE EVALUACIÓN</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'par_evaluador', 90) !!}</div>

<div class="sec-h2">4.5 TRABAJOS E INFORMES TÉCNICOS</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'informes_tecnicos', 90) !!}</div>

<div class="sec-h2">4.6 PUBLICACIONES</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'publicaciones', 90) !!}</div>

<div class="sec-h2">4.7 PERTENENCIA A ORGANIZACIONES</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'organizaciones', 90) !!}</div>

<div class="sec-h2">4.8 PONENCIAS</div>
<div class="campo-fila">{!! $getVal($hv, 'investigacion', 'ponencias', 90) !!}</div>

<!-- 5. REFERENCIAS -->
<div class="sec-h1">5. &nbsp; REFERENCIAS</div>

<div style="margin-bottom: 6px;">
    <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">REFERENCIA FAMILIAR</div>
    <div class="campo-fila"><span class="campo-label">NOMBRE COMPLETO:</span> {!! !empty($hv['referencia_familiar']['nombre']) ? '<span class="campo-val">'.e($hv['referencia_familiar']['nombre']).'</span>' : (!empty($e->contacto_emergencia) ? '<span class="campo-val">'.e($e->contacto_emergencia).'</span>' : '<span class="linea-blanco">________________________________________________</span>') !!}</div>
    <div class="campo-fila"><span class="campo-label">PROFESION U OCUPACION:</span> {!! $getVal($hv, 'referencia_familiar', 'profesion', 45) !!}</div>
    <div class="campo-fila"><span class="campo-label">PARENTESCO:</span> {!! !empty($hv['referencia_familiar']['parentesco']) ? '<span class="campo-val">'.e($hv['referencia_familiar']['parentesco']).'</span>' : '<span class="linea-blanco">________________</span>' !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">TELEFONO:</span> {!! !empty($hv['referencia_familiar']['telefono']) ? '<span class="campo-val">'.e($hv['referencia_familiar']['telefono']).'</span>' : (!empty($e->telefono_emergencia) ? '<span class="campo-val">'.e($e->telefono_emergencia).'</span>' : '<span class="linea-blanco">________________________</span>') !!}</div>
</div>

<div style="margin-top: 6px;">
    <div style="font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">REFERENCIA PERSONAL</div>
    <div class="campo-fila"><span class="campo-label">NOMBRE COMPLETO:</span> {!! $getVal($hv, 'referencia_personal', 'nombre', 50) !!}</div>
    <div class="campo-fila"><span class="campo-label">PROFESION U OCUPACION:</span> {!! $getVal($hv, 'referencia_personal', 'profesion', 45) !!} &nbsp;&nbsp;&nbsp;&nbsp; <span class="campo-label">TELÉFONO:</span> {!! $getVal($hv, 'referencia_personal', 'telefono', 30) !!}</div>
</div>

<!-- FIRMA DEL ESTUDIANTE: Simétrica, Compacta y Más Grande -->
<div class="firma-container">
    <div class="firma-box-img">
        @if(!empty($firma))
            <img src="{{ $firma }}" alt="Firma del Estudiante">
        @endif
    </div>
    <div class="firma-linea">
        FIRMA
    </div>
    <div class="firma-datos">
        <strong>{{ $e->user->nombres }} {{ $e->user->apellidos }}</strong><br>
        C.C. {{ $e->user->numero_documento }}
    </div>
</div>

</body>
</html>
