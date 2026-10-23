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
    public function ver(Estudiante $estudiante)
    {
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
    public function pdf(Estudiante $estudiante)
    {
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

        $logoPath = public_path('images/logo_fet.png');
        $logoBase64 = is_file($logoPath)
            ? 'data:image/png;base64,' . base64_encode(file_get_contents($logoPath))
            : null;

        $pdf = Pdf::loadView('documentos.hoja_vida', [
            'e'          => $estudiante,
            'firma'      => $firmaBase64,
            'logoBase64' => $logoBase64,
        ])->setPaper('letter');

        $nombre = 'hoja_de_vida_' . $estudiante->user->numero_documento . '.pdf';
        return $pdf->download($nombre);
    }
}
