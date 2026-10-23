<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
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
            'horas_cumplidas'        => 'required|integer|min:1|max:24',
            'actividades_realizadas' => 'required|string',
            'evidencia'              => 'nullable|file|mimes:pdf,jpg,jpeg,png|max:5120',
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
            'numero_documento' => 'required|string',
            'cargo_pasantia'   => 'nullable|string|max:100',
            'fecha_inicio'     => 'required|date',
            'fecha_fin'        => 'nullable|date|after_or_equal:fecha_inicio',
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

    // Empresario: Check de habilitado + firma (foto) del formato (RF07)
    public function aprobarAsistencia(Request $request, $id)
    {
        $request->validate([
            'check_habilitado' => 'required|boolean',
            'estado'           => 'required|in:aprobado,rechazado,pendiente',
            'observaciones'    => 'nullable|string',
        ]);

        $user = $request->user();
        $asistencia = FormatoAsistencia::with('pasantia.empresario')
            ->whereHas('pasantia.empresario', fn ($q) => $q->where('user_id', $user->id))
            ->findOrFail($id);

        $firmaUrl = $user->firma_digital ?: optional($user->empresario)->firma_imagen;

        if ($request->check_habilitado && ! $firmaUrl) {
            return response()->json([
                'message' => 'Debes subir la foto de tu firma antes de aprobar un formato.',
            ], 422);
        }

        $asistencia->update([
            'check_habilitado'     => $request->check_habilitado,
            'estado'               => $request->estado,
            'observaciones'        => $request->observaciones,
            'firma_empresario_url' => $request->check_habilitado ? $firmaUrl : null,
            'fecha_firma'          => $request->check_habilitado ? now() : null,
        ]);

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
        $empFirmaUrl = $empresario->user->firma_digital ?: $empresario->firma_imagen;
        if ($empFirmaUrl) {
            $fPath = public_path(ltrim($empFirmaUrl, '/'));
            if (is_file($fPath)) {
                $firmaEmpresarioBase64 = 'data:' . (mime_content_type($fPath) ?: 'image/png') . ';base64,' . base64_encode(file_get_contents($fPath));
            }
        }

        $pdf = Pdf::loadView('documentos.formato_asistencia', [
            'pasantia'               => $pasantia,
            'estudiante'             => $estudiante,
            'empresario'             => $empresario,
            'asistencias'            => $asistencias,
            'totalHoras'             => $totalHoras,
            'logoBase64'             => $logoBase64,
            'firmaEstudianteBase64'  => $firmaEstudianteBase64,
            'firmaEmpresarioBase64'  => $firmaEmpresarioBase64,
            'docenteNombre'          => 'JUAN GABRIEL CARVAJAL VEGA',
            'periodo'                => '2026-1',
        ])->setPaper('letter', 'portrait');

        $nombreArchivo = 'formato_asistencia_' . $estudiante->user->numero_documento . '.pdf';
        return $pdf->download($nombreArchivo);
    }
}

