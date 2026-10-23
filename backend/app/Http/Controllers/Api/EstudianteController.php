<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use App\Models\User;
use App\Models\Pase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EstudianteController extends Controller
{
    public function index()
    {
        $estudiantes = Estudiante::with(['user', 'programa', 'pase'])->get();
        return response()->json($estudiantes);
    }

    public function store(Request $request)
    {
        $request->validate([
            'nombres' => 'required|string',
            'apellidos' => 'required|string',
            'numero_documento' => 'required|string|unique:users',
            'email' => 'required|email|unique:users',
            'password' => 'required|string|min:6',
            'programa_id' => 'required|exists:programas,id',
            'codigo_estudiantil' => 'required|string|unique:estudiantes'
        ]);

        DB::beginTransaction();
        try {
            $user = User::create([
                'nombres' => $request->nombres,
                'apellidos' => $request->apellidos,
                'numero_documento' => $request->numero_documento,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'rol' => 'estudiante',
                'activo' => true
            ]);

            $estudiante = Estudiante::create([
                'user_id' => $user->id,
                'programa_id' => $request->programa_id,
                'codigo_estudiantil' => $request->codigo_estudiantil,
                'semestre' => $request->semestre ?? 1,
                'telefono' => $request->telefono ?? null,
            ]);

            Pase::create([
                'estudiante_id' => $estudiante->id,
                'codigo_qr' => (string) Str::uuid(),
                'periodo_academico' => '2026-2',
                'fecha_emision' => now(),
                'fecha_vencimiento' => now()->addMonths(6),
                'estado' => 'habilitado'
            ]);

            DB::commit();
            return response()->json(['message' => 'Estudiante registrado correctamente.', 'estudiante' => $estudiante->load('user', 'programa', 'pase')], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al registrar estudiante.', 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, Estudiante $estudiante)
    {
        $request->validate([
            'nombres' => 'sometimes|required|string',
            'apellidos' => 'sometimes|required|string',
            'numero_documento' => 'sometimes|required|string|unique:users,numero_documento,' . $estudiante->user_id,
            'email' => 'sometimes|required|email|unique:users,email,' . $estudiante->user_id,
            'programa_id' => 'sometimes|required|exists:programas,id',
            'codigo_estudiantil' => 'sometimes|required|string|unique:estudiantes,codigo_estudiantil,' . $estudiante->id,
            'semestre' => 'nullable|integer',
            'telefono' => 'nullable|string',
        ]);

        DB::beginTransaction();
        try {
            $userFields = $request->only(['nombres', 'apellidos', 'numero_documento', 'email']);
            if (!empty($userFields)) {
                $estudiante->user->update($userFields);
            }

            $estudianteFields = $request->only(['programa_id', 'codigo_estudiantil', 'semestre', 'telefono']);
            if (!empty($estudianteFields)) {
                $estudiante->update($estudianteFields);
            }

            DB::commit();
            return response()->json(['message' => 'Estudiante actualizado correctamente.', 'estudiante' => $estudiante->load('user', 'programa', 'pase')]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar.', 'error' => $e->getMessage()], 500);
        }
    }

    public function destroy(Estudiante $estudiante)
    {
        DB::beginTransaction();
        try {
            if ($estudiante->pase) $estudiante->pase->delete();
            $user = $estudiante->user;
            $estudiante->delete();
            if ($user) $user->delete();
            DB::commit();
            return response()->json(['message' => 'Estudiante eliminado.']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al eliminar.', 'error' => $e->getMessage()], 500);
        }
    }

    public function togglePase(Estudiante $estudiante)
    {
        $pase = $estudiante->pase;
        if (!$pase) {
            return response()->json(['message' => 'El estudiante no tiene un pase asignado.'], 404);
        }

        // Regla de Negocio (RF08): Bloqueo obligatorio de 1 día cronológico (24 horas)
        if ($pase->ultimo_cambio_estado) {
            $horasTranscurridas = now()->diffInHours($pase->ultimo_cambio_estado);
            if ($horasTranscurridas < 24) {
                $horasRestantes = 24 - $horasTranscurridas;
                return response()->json([
                    'message' => "El estado del pase tiene una vigencia obligatoria de 1 día cronológico. Faltan {$horasRestantes} hora(s) para poder modificarlo nuevamente.",
                    'horas_restantes' => $horasRestantes,
                    'bloqueado_por_regla' => true,
                ], 422);
            }
        }

        $estadoActual = strtolower((string)$pase->estado);
        $esHabilitado = in_array($estadoActual, ['activo', 'habilitado']);
        $nuevoEstado = $esHabilitado ? 'inhabilitado' : 'habilitado';

        $pase->estado = $nuevoEstado;
        $pase->ultimo_cambio_estado = now();
        $pase->save();

        return response()->json([
            'message' => 'Disponibilidad del pase actualizada con éxito.',
            'estado' => $pase->estado,
            'ultimo_cambio_estado' => $pase->ultimo_cambio_estado,
        ]);
    }

    public function buscarPorDocumento($documento)
    {
        $user = User::where('numero_documento', $documento)->first();
        if (!$user || !$user->estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $estudiante = $user->estudiante->load('user', 'programa', 'pase');
        return response()->json($estudiante);
    }
}
