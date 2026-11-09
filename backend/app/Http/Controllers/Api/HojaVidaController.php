<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Estudiante;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;

class HojaVidaController extends Controller
{
    private function cargar(Estudiante $estudiante): Estudiante
    {
        return $estudiante->load(['user', 'programa', 'pase', 'experiencias.evidencias']);
    }

    // Estudiante: su propia hoja de vida
    public function mia(Request $request)
    {
        $estudiante = $request->user()->estudiante;
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }
        return response()->json($this->cargar($estudiante));
    }

    // Admin / Empresario: hoja de vida de un estudiante (solo lectura)
    public function ver(Request $request, Estudiante $estudiante)
    {
        $user = $request->user();
        if ($user && $user->rol !== 'estudiante' && empty($estudiante->hoja_vida_pdf)) {
            return response()->json([
                'message' => 'El estudiante aún no ha subido su hoja de vida institucional.',
                'subida'  => false,
            ], 403);
        }
        return response()->json($this->cargar($estudiante));
    }

    // Estudiante: descarga su PDF
    public function pdfMio(Request $request)
    {
        $estudiante = $request->user()->estudiante;
        if (! $estudiante) {
            return response()->json(['message' => 'Estudiante no encontrado.'], 404);
        }
        return $this->generarPdf($estudiante);
    }

    // Admin / Empresario: descarga el PDF de un estudiante
    public function pdf(Request $request, Estudiante $estudiante)
    {
        $user = $request->user();
        if ($user && $user->rol !== 'estudiante' && empty($estudiante->hoja_vida_pdf)) {
            return response()->json([
                'message' => 'El estudiante aún no ha subido su hoja de vida institucional. No está disponible para descarga.',
            ], 403);
        }
        return $this->generarPdf($estudiante);
    }

    private function generarPdf(Estudiante $estudiante)
    {
        $this->cargar($estudiante);

        $firmaBase64 = null;
        if ($estudiante->user->firma_digital) {
            $ruta = public_path(ltrim($estudiante->user->firma_digital, '/'));
            if (is_file($ruta)) {
                $mime = mime_content_type($ruta) ?: 'image/png';
                $firmaBase64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($ruta));
            }
        }

        $fotoBase64 = null;
        $fotoRel = $estudiante->foto ?: optional($estudiante->user)->foto;
        if ($fotoRel) {
            $rutaFoto = public_path(ltrim($fotoRel, '/'));
            if (is_file($rutaFoto)) {
                $mime = mime_content_type($rutaFoto) ?: 'image/png';
                $fotoBase64 = 'data:' . $mime . ';base64,' . base64_encode(file_get_contents($rutaFoto));
            }
        }

        $logoPath = public_path('images/logo_fet_institucional.png');
        if (!is_file($logoPath)) {
            $logoPath = public_path('images/logo_fet.png');
        }
        $logoBase64 = is_file($logoPath)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('documentos.hoja_vida', [
            'e'          => $estudiante,
            'firma'      => $firmaBase64,
            'foto'       => $fotoBase64,
            'logoBase64' => $logoBase64,
        ])->setPaper('letter', 'portrait');

        $nombre = 'hoja_de_vida_' . $estudiante->user->numero_documento . '.pdf';
        return $pdf->download($nombre);
    }
}
