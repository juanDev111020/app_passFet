<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Experiencia;
use App\Models\EvidenciaArchivo;
use Illuminate\Support\Facades\Storage;

class PerfilController extends Controller
{
    // Obtener información completa del perfil profesional
    public function getPerfil(Request $request)
    {
        $user = $request->user();
        if ($user->rol === 'estudiante') {
            $estudiante = $user->estudiante()->with(['programa', 'pase', 'experiencias.evidencias'])->first();
            return response()->json([
                'user' => $user,
                'estudiante' => $estudiante,
            ]);
        } elseif ($user->rol === 'empresario') {
            $empresario = $user->empresario()->with('pasantias.estudiante.user')->first();
            return response()->json([
                'user' => $user,
                'empresario' => $empresario,
            ]);
        }

        return response()->json(['user' => $user]);
    }

    // Subir Hoja de Vida estrictamente en PDF (RF06)
    public function subirHojaVida(Request $request)
    {
        $request->validate([
            'hoja_vida' => 'required|file|mimes:pdf|max:10240', // Máx 10MB, sólo PDF
        ], [
            'hoja_vida.required' => 'Debes seleccionar un archivo PDF.',
            'hoja_vida.mimes'    => 'La Hoja de Vida debe estar estrictamente en formato PDF.',
            'hoja_vida.max'      => 'El archivo no debe superar los 10MB.',
        ]);

        $user = $request->user();
        $estudiante = $user->estudiante;
        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        // Eliminar archivo anterior si existe
        if ($estudiante->hoja_vida_pdf) {
            $rutaAnterior = str_replace('/storage/', '', $estudiante->hoja_vida_pdf);
            Storage::disk('public')->delete($rutaAnterior);
        }

        $archivo = $request->file('hoja_vida');
        $nombreArchivo = 'hv_' . $estudiante->id . '_' . time() . '.' . $archivo->getClientOriginalExtension();
        $path = $archivo->storeAs('hojas_vida', $nombreArchivo, 'public');

        $urlPublica = '/storage/' . $path;
        $estudiante->update(['hoja_vida_pdf' => $urlPublica]);

        return response()->json([
            'message' => 'Hoja de Vida en PDF subida correctamente.',
            'hoja_vida_pdf' => $urlPublica,
        ]);
    }

    // Subir Firma digital como imagen (RF07 / Requerimiento de firmas fotográficas)
    public function subirFirma(Request $request)
    {
        $request->validate([
            'firma' => 'required|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'firma.required' => 'Debes adjuntar la foto o imagen de tu firma.',
            'firma.image'    => 'El archivo debe ser una imagen válida (PNG, JPG, WEBP).',
            'firma.max'      => 'La imagen no debe pesar más de 5MB.',
        ]);

        $user = $request->user();

        // Eliminar firma anterior si existe
        if ($user->firma_digital) {
            $rutaAnterior = str_replace('/storage/', '', $user->firma_digital);
            Storage::disk('public')->delete($rutaAnterior);
        }

        $archivo = $request->file('firma');
        $nombre = 'firma_' . $user->id . '_' . time() . '.' . $archivo->getClientOriginalExtension();
        $path = $archivo->storeAs('firmas', $nombre, 'public');

        $urlPublica = '/storage/' . $path;
        $user->update(['firma_digital' => $urlPublica]);

        if ($user->rol === 'empresario' && $user->empresario) {
            $user->empresario->update(['firma_imagen' => $urlPublica]);
        }

        return response()->json([
            'message' => 'Foto de firma guardada correctamente.',
            'firma_digital' => $urlPublica,
        ]);
    }

    // Actualizar datos del perfil profesional (RF05)
    public function actualizarPerfil(Request $request)
    {
        $user = $request->user();
        $estudiante = $user->estudiante;
        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $request->validate([
            'resumen_profesional'      => 'nullable|string',
            'habilidades'              => 'nullable|string',
            'telefono'                 => 'nullable|string|max:20',
            'direccion'                => 'nullable|string|max:150',
            'ciudad'                   => 'nullable|string|max:150',
            'linkedin'                 => 'nullable|string|max:150',
            'idiomas'                  => 'nullable|string|max:150',
            'formacion_complementaria' => 'nullable|string',
        ]);

        $estudiante->update($request->only([
            'resumen_profesional', 'habilidades', 'telefono', 'direccion',
            'ciudad', 'linkedin', 'idiomas', 'formacion_complementaria',
        ]));

        return response()->json([
            'message' => 'Perfil profesional actualizado correctamente.',
            'estudiante' => $estudiante->load(['programa', 'pase', 'experiencias.evidencias']),
        ]);
    }

    // Registrar experiencia universitaria (Semillero, Proyecto de aplicación, etc. - RF05)
    public function storeExperiencia(Request $request)
    {
        $request->validate([
            'titulo'       => 'required|string|max:150',
            'tipo'         => 'required|in:semillero,proyecto_aplicacion,laboral,otro',
            'entidad'      => 'nullable|string|max:150',
            'descripcion'  => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date',
        ]);

        $estudiante = $request->user()->estudiante;
        if (!$estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }

        $experiencia = Experiencia::create([
            'estudiante_id' => $estudiante->id,
            'titulo'        => $request->titulo,
            'tipo'          => $request->tipo,
            'entidad'       => $request->entidad,
            'descripcion'   => $request->descripcion,
            'fecha_inicio'  => $request->fecha_inicio,
            'fecha_fin'     => $request->fecha_fin,
        ]);

        return response()->json([
            'message' => 'Experiencia universitaria registrada correctamente.',
            'experiencia' => $experiencia->load('evidencias'),
        ], 201);
    }

    // Editar experiencia universitaria (solo las propias)
    public function updateExperiencia(Request $request, $id)
    {
        $experiencia = Experiencia::where('estudiante_id', $request->user()->estudiante->id)->findOrFail($id);

        $datos = $request->validate([
            'titulo'       => 'required|string|max:150',
            'tipo'         => 'required|in:semillero,proyecto_aplicacion,laboral,otro',
            'entidad'      => 'nullable|string|max:150',
            'descripcion'  => 'nullable|string',
            'fecha_inicio' => 'nullable|date',
            'fecha_fin'    => 'nullable|date',
        ]);

        $experiencia->update($datos);

        return response()->json([
            'message' => 'Experiencia actualizada correctamente.',
            'experiencia' => $experiencia->load('evidencias'),
        ]);
    }

    // Eliminar experiencia universitaria (solo las propias)
    public function destroyExperiencia(Request $request, $id)
    {
        $experiencia = Experiencia::with('evidencias')
            ->where('estudiante_id', $request->user()->estudiante->id)
            ->findOrFail($id);

        // Eliminar evidencias físicas
        foreach ($experiencia->evidencias as $evidencia) {
            $ruta = str_replace('/storage/', '', $evidencia->archivo_url);
            Storage::disk('public')->delete($ruta);
        }

        $experiencia->delete();

        return response()->json(['message' => 'Experiencia eliminada con éxito.']);
    }

    // Subir evidencia (archivo/imagen) a una experiencia (RF05)
    public function subirEvidencia(Request $request, $experienciaId)
    {
        $request->validate([
            'archivo' => 'required|file|max:15360', // Máximo 15MB
        ]);

        $experiencia = Experiencia::where('estudiante_id', $request->user()->estudiante->id)->findOrFail($experienciaId);

        $archivo = $request->file('archivo');
        $nombreOriginal = $archivo->getClientOriginalName();
        $mime = $archivo->getMimeType();
        $nombre = 'evidencia_' . $experiencia->id . '_' . time() . '_' . uniqid() . '.' . $archivo->getClientOriginalExtension();
        $path = $archivo->storeAs('evidencias', $nombre, 'public');

        $urlPublica = Storage::url($path);

        $evidencia = EvidenciaArchivo::create([
            'experiencia_id'  => $experiencia->id,
            'archivo_url'     => $urlPublica,
            'nombre_original' => $nombreOriginal,
            'tipo_mime'       => $mime,
        ]);

        return response()->json([
            'message'   => 'Evidencia subida correctamente.',
            'evidencia' => $evidencia,
        ], 201);
    }

    // Eliminar archivo de evidencia
    public function destroyEvidencia(Request $request, $id)
    {
        $evidencia = EvidenciaArchivo::whereHas('experiencia', function ($q) use ($request) {
            $q->where('estudiante_id', $request->user()->estudiante->id);
        })->findOrFail($id);
        $ruta = str_replace('/storage/', '', $evidencia->archivo_url);
        Storage::disk('public')->delete($ruta);
        $evidencia->delete();

        return response()->json(['message' => 'Evidencia eliminada con éxito.']);
    }
}
