<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\FormatoAsistencia;
use App\Models\Pasantia;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class PasantiaController extends Controller
{
    // Estudiante: sus pasantías con los formatos de asistencia y su estado de firma
    public function getEstudiantePasantias(Request $request)
    {
        $estudiante = $request->user()->estudiante;
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $pasantias = Pasantia::where('estudiante_id', $estudiante->id)
            ->with(['empresario.user', 'formatosAsistencia' => fn ($q) => $q->orderByDesc('fecha_registro')])
            ->get();

        return response()->json($pasantias);
    }

    // Estudiante: registra un formato de asistencia en una de SUS pasantías
    public function storeAsistencia(Request $request)
    {
        $request->validate([
            'pasantia_id'            => 'required|exists:pasantias,id',
            'semana'                 => 'nullable|string|max:50',
            'fecha_registro'         => 'required|date',
            'horas_cumplidas'        => ['required', 'integer', 'between:1,42'],
            'actividades_realizadas' => 'required|string',
            'evidencia'              => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
        ], [
            'pasantia_id.required'            => 'La pasantía es obligatoria.',
            'fecha_registro.required'         => 'La fecha de registro es obligatoria.',
            'horas_cumplidas.required'        => 'Las horas cumplidas son obligatorias.',
            'horas_cumplidas.between'         => 'Las horas cumplidas deben estar entre 1 y 42 horas.',
            'actividades_realizadas.required' => 'Debes detallar las actividades realizadas.',
            'evidencia.mimes'                 => 'La evidencia debe ser un archivo PDF, JPG o PNG.',
            'evidencia.max'                   => 'La evidencia no debe superar 5MB.',
        ]);

        $pasantia = Pasantia::where('estudiante_id', $request->user()->estudiante->id)
            ->where('estado', 'activa')
            ->find($request->pasantia_id);

        if (! $pasantia) {
            return response()->json(['message' => 'La pasantía no existe o no está activa.'], 422);
        }

        $evidenciaUrl = null;
        if ($request->hasFile('evidencia')) {
            $path = $request->file('evidencia')->store('evidencias_asistencia', 'public');
            $evidenciaUrl = '/storage/' . $path;
        }

        $asistencia = FormatoAsistencia::create([
            'pasantia_id'            => $pasantia->id,
            'semana'                 => $request->semana,
            'fecha_registro'         => $request->fecha_registro,
            'horas_cumplidas'        => $request->horas_cumplidas,
            'actividades_realizadas' => $request->actividades_realizadas,
            'evidencia_url'          => $evidenciaUrl,
            'check_habilitado'       => false,
            'estado'                 => 'pendiente',
        ]);

        return response()->json([
            'message'    => 'Formato de asistencia registrado y enviado a revisión del empresario.',
            'asistencia' => $asistencia,
        ], 201);
    }

    // Empresario: sus pasantes con formatos de asistencia
    public function getPasantesEmpresario(Request $request)
    {
        $empresario = $request->user()->empresario;
        if (! $empresario) {
            return response()->json(['message' => 'Perfil de empresario no encontrado.'], 404);
        }

        $pasantias = Pasantia::where('empresario_id', $empresario->id)
            ->with([
                'estudiante.user', 'estudiante.programa', 'estudiante.pase',
                'formatosAsistencia' => fn ($q) => $q->orderByDesc('fecha_registro'),
            ])
            ->get();

        return response()->json([
            'empresario' => $empresario->load('user'),
            'pasantias'  => $pasantias,
        ]);
    }

    // Empresario: vincula a un estudiante HABILITADO (por documento) como pasante
    public function vincular(Request $request)
    {
        $datos = $request->validate([
            'numero_documento' => ['required', 'string', 'regex:/^[0-9]{5,10}$/'],
            'cargo_pasantia'   => ['nullable', 'string', 'regex:/^[\pL\s]+$/u', 'max:100'],
            'fecha_inicio'     => 'required|date',
            'fecha_fin'        => 'nullable|date|after_or_equal:fecha_inicio',
        ], [
            'numero_documento.required' => 'El número de documento es obligatorio.',
            'numero_documento.regex'    => 'El documento debe contener solo números (entre 5 y 10 dígitos).',
            'cargo_pasantia.regex'      => 'El cargo solo puede contener letras y espacios.',
            'cargo_pasantia.max'        => 'El cargo no debe superar los 100 caracteres.',
            'fecha_inicio.required'     => 'La fecha de inicio es obligatoria.',
            'fecha_fin.after_or_equal'  => 'La fecha de fin debe ser igual o posterior a la fecha de inicio.',
        ]);

        $user = User::where('numero_documento', $datos['numero_documento'])->where('rol', 'estudiante')->first();
        if (! $user || ! $user->estudiante) {
            return response()->json(['message' => 'No existe un estudiante con ese documento.'], 404);
        }

        $estudiante = $user->estudiante->load('pase');
        $estado = strtolower((string) optional($estudiante->pase)->estado);
        if (! in_array($estado, ['habilitado', 'activo'])) {
            return response()->json(['message' => 'El estudiante está inhabilitado y no puede vincularse a una pasantía.'], 422);
        }

        $empresario = $request->user()->empresario;
        $existe = Pasantia::where('estudiante_id', $estudiante->id)
            ->where('empresario_id', $empresario->id)
            ->where('estado', 'activa')->exists();
        if ($existe) {
            return response()->json(['message' => 'Este estudiante ya está vinculado a tu empresa.'], 422);
        }

        $pasantia = Pasantia::create([
            'estudiante_id'  => $estudiante->id,
            'empresario_id'  => $empresario->id,
            'cargo_pasantia' => $datos['cargo_pasantia'] ?? null,
            'fecha_inicio'   => $datos['fecha_inicio'],
            'fecha_fin'      => $datos['fecha_fin'] ?? null,
            'estado'         => 'activa',
        ]);

        return response()->json([
            'message'  => 'Estudiante vinculado como pasante correctamente.',
            'pasantia' => $pasantia->load(['estudiante.user', 'estudiante.programa', 'estudiante.pase', 'formatosAsistencia']),
        ], 201);
    }

    // Admin: obtener pasantías y asistencias de un estudiante específico para seguimiento
    public function getPasantiasDeEstudiante(Estudiante $estudiante)
    {
        $pasantias = Pasantia::where('estudiante_id', $estudiante->id)
            ->with([
                'empresario.user',
                'estudiante.user',
                'formatosAsistencia' => fn ($q) => $q->orderBy('fecha_registro', 'desc'),
            ])
            ->get();

        return response()->json($pasantias);
    }

    // Empresario o Administrador: Check de habilitación + firma (foto) del formato
    public function aprobarAsistencia(Request $request, $id)
    {
        $request->validate([
            'check_habilitado' => 'required|boolean',
            'estado'           => 'required|in:aprobado,rechazado,pendiente',
            'observaciones'    => 'nullable|string',
        ]);

        $user = $request->user();

        if ($user->rol === 'admin') {
            $asistencia = FormatoAsistencia::with('pasantia.empresario')->findOrFail($id);
            $firmaUrl = $user->firma_digital;
        } else {
            $asistencia = FormatoAsistencia::with('pasantia.empresario')
                ->whereHas('pasantia.empresario', fn ($q) => $q->where('user_id', $user->id))
                ->findOrFail($id);
            $firmaUrl = $user->firma_digital ?: optional($user->empresario)->firma_imagen;
        }

        if ($request->check_habilitado && ! $firmaUrl) {
            return response()->json([
                'message' => 'Debes subir la foto de tu firma antes de aprobar un formato.',
            ], 422);
        }

        $datosActualizar = [
            'estado'        => $request->estado,
            'observaciones' => $request->observaciones,
        ];

        if ($user->rol === 'admin') {
            $datosActualizar['check_docente'] = $request->check_habilitado;
            $datosActualizar['firma_docente_url'] = $request->check_habilitado ? $firmaUrl : null;
            $datosActualizar['fecha_firma_docente'] = $request->check_habilitado ? now() : null;
            // Si el admin aprueba, también valida el formato general
            if ($request->check_habilitado) {
                $datosActualizar['check_habilitado'] = true;
            }
        } else {
            $datosActualizar['check_habilitado'] = $request->check_habilitado;
            $datosActualizar['firma_empresario_url'] = $request->check_habilitado ? $firmaUrl : null;
            $datosActualizar['fecha_firma'] = $request->check_habilitado ? now() : null;
        }

        $asistencia->update($datosActualizar);

        return response()->json([
            'message'    => $request->check_habilitado
                ? 'Formato aprobado y firmado correctamente.'
                : 'Formato actualizado.',
            'asistencia' => $asistencia,
        ]);
    }

    // Generar y descargar el Formato Institucional de Asistencia en PDF
    public function asistenciaPdf(Request $request, $id)
    {
        $user = $request->user();
        $pasantia = Pasantia::with([
            'estudiante.user',
            'estudiante.pase',
            'estudiante.programa',
            'empresario.user',
            'formatosAsistencia' => fn ($q) => $q->orderBy('fecha_registro', 'asc'),
        ])->findOrFail($id);

        $esAdmin = $user->rol === 'admin';
        $esEstudiante = $user->rol === 'estudiante' && optional($user->estudiante)->id === $pasantia->estudiante_id;
        $esEmpresario = $user->rol === 'empresario' && optional($user->empresario)->id === $pasantia->empresario_id;

        if (! $esAdmin && ! $esEstudiante && ! $esEmpresario) {
            return response()->json(['message' => 'No tienes permiso para descargar este formato.'], 403);
        }

        $estudiante = $pasantia->estudiante;
        $empresario = $pasantia->empresario;
        $asistencias = $pasantia->formatosAsistencia;
        $totalHoras = $asistencias->where('check_habilitado', true)->sum('horas_cumplidas');

        // Logo FET
        $logoPath = public_path('images/logo_fet.png');
        $logoBase64 = is_file($logoPath)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        // Firma estudiante
        $firmaEstudianteBase64 = null;
        if ($estudiante->user->firma_digital) {
            $fPath = public_path(ltrim($estudiante->user->firma_digital, '/'));
            if (is_file($fPath)) {
                $firmaEstudianteBase64 = 'data:' . (mime_content_type($fPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($fPath));
            }
        }

        // Firma empresario
        $firmaEmpresarioBase64 = null;
        $empFirmaUrl = $asistencias->whereNotNull('firma_empresario_url')->value('firma_empresario_url')
            ?? ($empresario->user->firma_digital ?: $empresario->firma_imagen);
        if ($empFirmaUrl) {
            $fPath = public_path(ltrim($empFirmaUrl, '/'));
            if (is_file($fPath)) {
                $firmaEmpresarioBase64 = 'data:' . (mime_content_type($fPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($fPath));
            }
        }

        // Firma docente FET / Admin institucional
        $firmaDocenteBase64 = null;
        $adminConFirma = User::where('rol', 'admin')->whereNotNull('firma_digital')->first();
        $adminDocente = $adminConFirma ?: User::where('rol', 'admin')->first();
        $docenteNombre = $adminDocente ? trim($adminDocente->nombres . ' ' . $adminDocente->apellidos) : 'Docente Tutor FET';

        $docenteFirmaUrl = $asistencias->whereNotNull('firma_docente_url')->value('firma_docente_url')
            ?? optional($adminConFirma)->firma_digital;

        if ($docenteFirmaUrl) {
            $fPath = public_path(ltrim($docenteFirmaUrl, '/'));
            if (is_file($fPath)) {
                $firmaDocenteBase64 = 'data:' . (mime_content_type($fPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($fPath));
            }
        }

        $periodo = $estudiante->pase?->periodo_academico ?? '2026-2';

        $pdf = Pdf::loadView('documentos.formato_asistencia', [
            'pasantia'               => $pasantia,
            'estudiante'             => $estudiante,
            'empresario'             => $empresario,
            'asistencias'            => $asistencias,
            'totalHoras'             => $totalHoras,
            'logoBase64'             => $logoBase64,
            'firmaEstudianteBase64'  => $firmaEstudianteBase64,
            'firmaEmpresarioBase64'  => $firmaEmpresarioBase64,
            'firmaDocenteBase64'     => $firmaDocenteBase64,
            'docenteNombre'          => $docenteNombre,
            'periodo'                => $periodo,
        ])->setPaper('letter', 'portrait');

        $nombreArchivo = 'formato_asistencia_' . $estudiante->user->numero_documento . '.pdf';
        return $pdf->download($nombreArchivo);
    }
}

