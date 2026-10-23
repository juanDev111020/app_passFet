<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Formato de Asistencia de Prácticas - {{ $estudiante->user->nombres }} {{ $estudiante->user->apellidos }}</title>
    <style>
        @page {
            margin: 18mm 14mm 16mm 14mm;
            size: letter portrait;
        }
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 9.5px;
            color: #14201a;
            margin: 0;
            padding: 0;
        }
        .header-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #08940c;
            margin-bottom: 12px;
        }
        .header-table td {
            padding: 6px 10px;
            vertical-align: middle;
        }
        .logo-cell {
            width: 120px;
            text-align: center;
            border-right: 1.5px solid #08940c;
        }
        .logo-cell img {
            max-height: 48px;
            max-width: 110px;
        }
        .title-cell {
            text-align: center;
        }
        .title-cell .inst {
            font-size: 9px;
            font-weight: bold;
            color: #067a0a;
            text-transform: uppercase;
            letter-spacing: .5px;
            margin: 0 0 3px;
        }
        .title-cell .doc-name {
            font-size: 13px;
            font-weight: bold;
            color: #14201a;
            text-transform: uppercase;
            margin: 0;
        }
        .info-table {
            width: 100%;
            border-collapse: collapse;
            border: 1px solid #dfe6e1;
            margin-bottom: 14px;
        }
        .info-table td {
            padding: 5px 8px;
            border: 1px solid #dfe6e1;
            font-size: 9px;
        }
        .info-label {
            font-weight: bold;
            color: #067a0a;
            text-transform: uppercase;
            width: 23%;
            background: #f4fbf5;
        }
        .info-val {
            color: #14201a;
            width: 27%;
        }
        .table-asistencia {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
        }
        .table-asistencia th {
            background: #08940c;
            color: #ffffff;
            font-size: 8.5px;
            text-transform: uppercase;
            letter-spacing: .3px;
            padding: 6px 4px;
            border: 1px solid #08940c;
            text-align: center;
        }
        .table-asistencia td {
            border: 1px solid #d3ded6;
            padding: 5px 6px;
            font-size: 8.5px;
            vertical-align: middle;
        }
        .badge-check {
            display: inline-block;
            background: #e8f8ea;
            color: #067a0a;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
        }
        .badge-pend {
            display: inline-block;
            background: #fef7e0;
            color: #b06000;
            font-weight: bold;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 8px;
        }
        .firma-mini {
            max-height: 28px;
            max-width: 70px;
            display: block;
            margin: 0 auto;
        }
        .total-box {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 18px;
        }
        .total-box td {
            padding: 6px 10px;
            border: 1px solid #08940c;
            font-size: 9.5px;
            font-weight: bold;
        }
        .total-label {
            background: #08940c;
            color: #fff;
            text-align: right;
            text-transform: uppercase;
        }
        .total-val {
            background: #e8f8ea;
            color: #067a0a;
            text-align: center;
            width: 130px;
            font-size: 11px;
        }
        .firmas-grid {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }
        .firmas-grid td {
            width: 33.33%;
            vertical-align: bottom;
            text-align: center;
            padding: 0 10px;
        }
        .firma-slot {
            min-height: 55px;
            margin-bottom: 4px;
        }
        .firma-slot img {
            max-height: 52px;
            max-width: 140px;
        }
        .linea-firma {
            border-top: 1.5px solid #14201a;
            padding-top: 4px;
            font-size: 8.5px;
            color: #14201a;
        }
        .linea-firma .cargo {
            color: #5f6b64;
            font-size: 7.5px;
            text-transform: uppercase;
            margin-top: 2px;
        }
        .pie {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            font-size: 7.5px;
            color: #7b8880;
            text-align: center;
            border-top: 1px solid #dfe6e1;
            padding-top: 4px;
        }
    </style>
</head>
<body>

<table class="header-table">
    <tr>
        <td class="logo-cell">
            @if(!empty($logoBase64))
                <img src="{{ $logoBase64 }}" alt="FET Logo">
            @else
                <strong style="color:#08940c; font-size:16px;">FET</strong>
            @endif
        </td>
        <td class="title-cell">
            <div class="inst">Fundación Escuela Tecnológica de Neiva "Jesús Oviedo Pérez"</div>
            <div class="doc-name">Registro de Asistencia Prácticas Profesionales</div>
        </td>
    </tr>
</table>

<table class="info-table">
    <tr>
        <td class="info-label">Nombre de la Empresa</td>
        <td class="info-val"><strong>{{ $empresario->razon_social ?? optional($empresario->user)->nombres }}</strong></td>
        <td class="info-label">Periodo Académico</td>
        <td class="info-val"><strong>{{ $periodo ?? '2026-1' }}</strong></td>
    </tr>
    <tr>
        <td class="info-label">Nombre del Estudiante</td>
        <td class="info-val"><strong>{{ $estudiante->user->nombres }} {{ $estudiante->user->apellidos }}</strong></td>
        <td class="info-label">Documento / Código</td>
        <td class="info-val">{{ $estudiante->user->numero_documento }} · {{ $estudiante->codigo_estudiantil }}</td>
    </tr>
    <tr>
        <td class="info-label">Programa Académico</td>
        <td class="info-val">{{ $estudiante->programa->nombre ?? 'Ingeniería de Software' }}</td>
        <td class="info-label">Cargo / Función</td>
        <td class="info-val">{{ $pasantia->cargo_pasantia ?: 'Pasante de Prácticas' }}</td>
    </tr>
</table>

<table class="table-asistencia">
    <thead>
        <tr>
            <th style="width: 14%;">Semana / Fecha</th>
            <th style="width: 44%;">Actividades Realizadas</th>
            <th style="width: 8%;">Horas</th>
            <th style="width: 16%;">Check Habilitado</th>
            <th style="width: 18%;">Firma Tutor</th>
        </tr>
    </thead>
    <tbody>
        @forelse($asistencias as $idx => $a)
            <tr>
                <td style="text-align: center;">
                    <strong>{{ $a->semana ?: ('Registro #' . ($idx + 1)) }}</strong><br>
                    <span style="color:#5f6b64; font-size:7.5px;">{{ \Carbon\Carbon::parse($a->fecha_registro)->format('d/m/Y') }}</span>
                </td>
                <td style="line-height: 1.35;">{{ $a->actividades_realizadas }}</td>
                <td style="text-align: center; font-weight: bold; color: #067a0a;">{{ $a->horas_cumplidas }} h</td>
                <td style="text-align: center;">
                    @if($a->check_habilitado)
                        <span class="badge-check">✓ Habilitado</span>
                    @else
                        <span class="badge-pend">⏳ Pendiente</span>
                    @endif
                </td>
                <td style="text-align: center;">
                    @if($a->firma_empresario_url)
                        @php
                            $fPath = public_path(ltrim($a->firma_empresario_url, '/'));
                            $fB64 = is_file($fPath) ? 'data:' . (mime_content_type($fPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($fPath)) : null;
                        @endphp
                        @if($fB64)
                            <img src="{{ $fB64 }}" class="firma-mini" alt="Firma Tutor">
                        @else
                            <span style="font-size:7.5px; color:#067a0a; font-weight:bold;">Validado Digital</span>
                        @endif
                    @else
                        <span style="color:#9e9e9e; font-size:7.5px;">Sin firma</span>
                    @endif
                </td>
            </tr>
        @empty
            <tr>
                <td colspan="5" style="text-align:center; padding:15px; color:#5f6b64;">No se registran sesiones de asistencia para esta pasantía aún.</td>
            </tr>
        @endforelse
    </tbody>
</table>

<table class="total-box">
    <tr>
        <td class="total-label">Total Horas Certificadas</td>
        <td class="total-val">{{ $totalHoras }} Horas</td>
    </tr>
</table>

<table class="firmas-grid">
    <tr>
        <td>
            <div class="firma-slot">
                @if(!empty($firmaEstudianteBase64))
                    <img src="{{ $firmaEstudianteBase64 }}" alt="Firma Estudiante">
                @endif
            </div>
            <div class="linea-firma">
                <strong>{{ $estudiante->user->nombres }} {{ $estudiante->user->apellidos }}</strong><br>
                <span>C.C. {{ $estudiante->user->numero_documento }}</span>
                <div class="cargo">Estudiante Pasante</div>
            </div>
        </td>
        <td>
            <div class="firma-slot">
                @if(!empty($firmaEmpresarioBase64))
                    <img src="{{ $firmaEmpresarioBase64 }}" alt="Firma Tutor">
                @endif
            </div>
            <div class="linea-firma">
                <strong>{{ $empresario->user->nombres }} {{ $empresario->user->apellidos }}</strong><br>
                <span>{{ $empresario->cargo_contacto ?: 'Tutor Empresarial' }}</span>
                <div class="cargo">{{ $empresario->razon_social }}</div>
            </div>
        </td>
        <td>
            <div class="firma-slot">
                {{-- Espacio para firma institucional Docente FET --}}
            </div>
            <div class="linea-firma">
                <strong>{{ $docenteNombre ?? 'JUAN GABRIEL CARVAJAL VEGA' }}</strong><br>
                <span>Docente Asesor / Tutor FET</span>
                <div class="cargo">Fundación Escuela Tecnológica</div>
            </div>
        </td>
    </tr>
</table>

<div class="pie">
    PassFet · Sistema de Seguimiento y Prácticas Profesionales FET · Generado: {{ now()->format('d/m/Y H:i') }} · Página 1
</div>

</body>
</html>
