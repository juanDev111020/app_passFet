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

    /**
     * Procesa una imagen ajustando EXIF y aplicando rotación si se solicita.
     */
    private function procesarYGuardarImagen($archivo, string $carpeta, string $prefijo, int $gradosAdicionales = 0): string
    {
        $extension = strtolower($archivo->getClientOriginalExtension());
        $tempPath = $archivo->getRealPath();

        $nombre = $prefijo . '_' . uniqid() . '_' . time() . '.png';
        $destinoRelativo = $carpeta . '/' . $nombre;
        $destinoCompleto = storage_path('app/public/' . $destinoRelativo);

        if (!is_dir(dirname($destinoCompleto))) {
            mkdir(dirname($destinoCompleto), 0755, true);
        }

        $img = null;
        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                $img = @imagecreatefromjpeg($tempPath);
                if ($img && function_exists('exif_read_data')) {
                    $exif = @exif_read_data($tempPath);
                    if (!empty($exif['Orientation'])) {
                        switch ($exif['Orientation']) {
                            case 3:
                                $img = imagerotate($img, 180, 0);
                                break;
                            case 6:
                                $img = imagerotate($img, -90, 0);
                                break;
                            case 8:
                                $img = imagerotate($img, 90, 0);
                                break;
                        }
                    }
                }
                break;
            case 'png':
                $img = @imagecreatefrompng($tempPath);
                break;
            case 'webp':
                $img = @imagecreatefromwebp($tempPath);
                break;
            default:
                $img = @imagecreatefromstring(file_get_contents($tempPath));
                break;
        }

        if (!$img) {
            $path = $archivo->storeAs($carpeta, $nombre, 'public');
            return '/storage/' . $path;
        }

        if ($gradosAdicionales % 360 !== 0) {
            $img = imagerotate($img, -$gradosAdicionales, imagecolorallocatealpha($img, 0, 0, 0, 127));
        }

        imagealphablending($img, false);
        imagesavealpha($img, true);
        imagepng($img, $destinoCompleto, 8);
        imagedestroy($img);

        return '/storage/' . $destinoRelativo;
    }

    // Subir Firma digital como imagen (RF07 / Requerimiento de firmas fotográficas)
    public function subirFirma(Request $request)
    {
        $request->validate([
            'firma'       => 'required|image|mimes:jpeg,png,jpg,webp|max:20480',
            'rotacion'    => 'nullable|integer',
            'orientacion' => 'nullable|in:horizontal,vertical',
        ], [
            'firma.required' => 'Debes adjuntar la foto o imagen de tu firma.',
            'firma.image'    => 'El archivo debe ser una imagen válida (PNG, JPG, WEBP).',
            'firma.max'      => 'La imagen no debe pesar más de 20MB.',
        ]);

        $user = $request->user();

        // Eliminar firma anterior si existe
        if ($user->firma_digital) {
            $rutaAnterior = str_replace('/storage/', '', $user->firma_digital);
            Storage::disk('public')->delete($rutaAnterior);
        }

        $rotacion = (int) $request->input('rotacion', 0);
        $orientacion = $request->input('orientacion', 'horizontal');
        if ($orientacion === 'vertical' && $rotacion === 0) {
            $rotacion = 90;
        }

        $urlPublica = $this->procesarYGuardarImagen($request->file('firma'), 'firmas', 'firma_' . $user->id, $rotacion);

        $user->update([
            'firma_digital'     => $urlPublica,
            'firma_orientacion' => $orientacion,
        ]);

        if ($user->rol === 'empresario' && $user->empresario) {
            $user->empresario->update(['firma_imagen' => $urlPublica]);
        }

        return response()->json([
            'message'           => 'Foto de firma guardada correctamente.',
            'firma_digital'     => $urlPublica,
            'firma_orientacion' => $orientacion,
        ]);
    }

    // Rotar firma digital existente (90° por llamada o orientación específica)
    public function rotarFirma(Request $request)
    {
        $user = $request->user();
        $firmaUrl = $user->firma_digital ?: optional($user->empresario)->firma_imagen;
        if (!$firmaUrl) {
            return response()->json(['message' => 'No tienes una firma registrada para rotar.'], 422);
        }

        $grados = (int) $request->input('grados', 90);
        $rutaFisica = public_path(ltrim($firmaUrl, '/'));
        if (!is_file($rutaFisica)) {
            $rutaFisica = storage_path('app/public/' . preg_replace('#^/?storage/#', '', $firmaUrl));
        }
        if (!is_file($rutaFisica)) {
            return response()->json(['message' => 'Archivo de firma no encontrado en el servidor.'], 404);
        }

        $extension = strtolower(pathinfo($rutaFisica, PATHINFO_EXTENSION));
        $img = null;
        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                $img = @imagecreatefromjpeg($rutaFisica);
                break;
            case 'png':
                $img = @imagecreatefrompng($rutaFisica);
                break;
            case 'webp':
                $img = @imagecreatefromwebp($rutaFisica);
                break;
            default:
                $img = @imagecreatefromstring(file_get_contents($rutaFisica));
                break;
        }

        if (!$img) {
            return response()->json(['message' => 'No se pudo procesar la imagen de firma.'], 500);
        }

        $img = imagerotate($img, -$grados, imagecolorallocatealpha($img, 0, 0, 0, 127));
        imagealphablending($img, false);
        imagesavealpha($img, true);

        $nuevoNombre = 'firma_' . $user->id . '_' . time() . '.png';
        $nuevoDestino = storage_path('app/public/firmas/' . $nuevoNombre);
        if (!is_dir(dirname($nuevoDestino))) {
            mkdir(dirname($nuevoDestino), 0755, true);
        }
        imagepng($img, $nuevoDestino, 8);
        imagedestroy($img);

        @unlink($rutaFisica);

        $nuevaUrl = '/storage/firmas/' . $nuevoNombre;
        $nuevaOrientacion = ($user->firma_orientacion === 'vertical') ? 'horizontal' : 'vertical';
        if ($request->filled('orientacion')) {
            $nuevaOrientacion = $request->orientacion;
        }

        $user->update([
            'firma_digital'     => $nuevaUrl,
            'firma_orientacion' => $nuevaOrientacion,
        ]);

        if ($user->rol === 'empresario' && $user->empresario) {
            $user->empresario->update(['firma_imagen' => $nuevaUrl]);
        }

        return response()->json([
            'message'           => 'Firma rotada correctamente.',
            'firma_digital'     => $nuevaUrl,
            'firma_orientacion' => $nuevaOrientacion,
        ]);
    }

    // Subir Foto de Perfil / Hoja de Vida (3x4)
    public function subirFoto(Request $request)
    {
        $request->validate([
            'foto'     => 'required|image|mimes:jpeg,png,jpg,webp|max:20480',
            'rotacion' => 'nullable|integer',
        ], [
            'foto.required' => 'Debes adjuntar la foto para la hoja de vida.',
            'foto.image'    => 'El archivo debe ser una imagen válida (PNG, JPG, WEBP).',
            'foto.max'      => 'La foto no debe pesar más de 20MB.',
        ]);

        $user = $request->user();

        // Eliminar foto anterior si existe
        if ($user->foto) {
            $rutaAnterior = str_replace('/storage/', '', $user->foto);
            Storage::disk('public')->delete($rutaAnterior);
        }

        $rotacion = (int) $request->input('rotacion', 0);
        $urlPublica = $this->procesarYGuardarImagen($request->file('foto'), 'fotos', 'foto_' . $user->id, $rotacion);

        $user->update(['foto' => $urlPublica]);
        if ($user->estudiante) {
            $user->estudiante->update(['foto' => $urlPublica]);
        }

        return response()->json([
            'message' => 'Foto para hoja de vida guardada correctamente.',
            'foto'    => $urlPublica,
        ]);
    }

    // Rotar Foto existente de Hoja de Vida (90°)
    public function rotarFoto(Request $request)
    {
        $user = $request->user();
        $fotoUrl = $user->foto ?? optional($user->estudiante)->foto;
        if (!$fotoUrl) {
            return response()->json(['message' => 'No tienes una foto registrada para rotar.'], 422);
        }

        $grados = (int) $request->input('grados', 90);
        $rutaFisica = public_path(ltrim($fotoUrl, '/'));
        if (!is_file($rutaFisica)) {
            $rutaFisica = storage_path('app/public/' . preg_replace('#^/?storage/#', '', $fotoUrl));
        }
        if (!is_file($rutaFisica)) {
            return response()->json(['message' => 'Archivo de foto no encontrado en el servidor.'], 404);
        }

        $extension = strtolower(pathinfo($rutaFisica, PATHINFO_EXTENSION));
        $img = null;
        switch ($extension) {
            case 'jpg':
            case 'jpeg':
                $img = @imagecreatefromjpeg($rutaFisica);
                break;
            case 'png':
                $img = @imagecreatefrompng($rutaFisica);
                break;
            case 'webp':
                $img = @imagecreatefromwebp($rutaFisica);
                break;
            default:
                $img = @imagecreatefromstring(file_get_contents($rutaFisica));
                break;
        }

        if (!$img) {
            return response()->json(['message' => 'No se pudo procesar la foto.'], 500);
        }

        $img = imagerotate($img, -$grados, imagecolorallocatealpha($img, 0, 0, 0, 127));
        imagealphablending($img, false);
        imagesavealpha($img, true);

        $nuevoNombre = 'foto_' . $user->id . '_' . time() . '.png';
        $nuevoDestino = storage_path('app/public/fotos/' . $nuevoNombre);
        if (!is_dir(dirname($nuevoDestino))) {
            mkdir(dirname($nuevoDestino), 0755, true);
        }
        imagepng($img, $nuevoDestino, 8);
        imagedestroy($img);

        @unlink($rutaFisica);

        $nuevaUrl = '/storage/fotos/' . $nuevoNombre;
        $user->update(['foto' => $nuevaUrl]);
        if ($user->estudiante) {
            $user->estudiante->update(['foto' => $nuevaUrl]);
        }

        return response()->json([
            'message' => 'Foto rotada correctamente.',
            'foto'    => $nuevaUrl,
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
            'resumen_profesional'      => 'nullable|string|max:1000',
            'habilidades'              => 'nullable|string|max:500',
            'telefono'                 => ['nullable', 'string', 'regex:/^[0-9]{7,10}$/'],
            'direccion'                => 'nullable|string|max:150',
            'ciudad'                   => ['nullable', 'string', 'regex:/^[\pL\s]+$/u', 'max:100'],
            'linkedin'                 => 'nullable|string|max:150',
            'idiomas'                  => 'nullable|string|max:150',
            'formacion_complementaria' => 'nullable|string|max:1000',
            'fecha_nacimiento'         => 'nullable|date',
            'lugar_nacimiento'         => 'nullable|string|max:100',
            'estado_civil'             => 'nullable|string|max:50',
            'rh'                       => 'nullable|string|max:10',
            'contacto_emergencia'      => 'nullable|string|max:150',
            'telefono_emergencia'      => ['nullable', 'string', 'max:50'],
            'datos_formato_hv'         => 'nullable|array',
        ], [
            'telefono.regex' => 'El teléfono solo debe contener números (entre 7 y 10 dígitos).',
            'ciudad.regex'   => 'La ciudad solo puede contener letras y espacios.',
        ]);

        $estudiante->update($request->only([
            'resumen_profesional', 'habilidades', 'telefono', 'direccion',
            'ciudad', 'linkedin', 'idiomas', 'formacion_complementaria',
            'fecha_nacimiento', 'lugar_nacimiento', 'estado_civil', 'rh',
            'contacto_emergencia', 'telefono_emergencia',
            'datos_formato_hv',
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
        ], [
            'titulo.required' => 'El título de la experiencia es obligatorio.',
            'tipo.required'   => 'El tipo de experiencia es obligatorio.',
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
