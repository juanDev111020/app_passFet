<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EstudianteController;
use App\Http\Controllers\Api\PerfilController;
use App\Http\Controllers\Api\HojaVidaController;
use App\Http\Controllers\Api\PasantiaController;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

// Prueba de conexión con la BD
Route::get('/health', function () {
    try {
        DB::connection()->getPdo();
        $db = 'conectada';
    } catch (\Throwable $e) {
        $db = 'sin conexión';
    }
    return response()->json(['api' => 'ok', 'database' => $db]);
});

Route::post('/auth/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Programas académicos
    Route::get('/programas', function () {
        return response()->json(\App\Models\Programa::where('activo', true)->get());
    });

    // Perfil y firma (cualquier usuario autenticado puede ver su perfil y subir su firma)
    Route::get('/perfil', [PerfilController::class, 'getPerfil']);
    Route::post('/perfil/firma', [PerfilController::class, 'subirFirma']);

    // ---------------- ADMIN ----------------
    Route::middleware('rol:admin')->group(function () {
        // CRUD Estudiantes y control de pase con regla de 1 día (RF02, RF03, RF08)
        Route::apiResource('/estudiantes', EstudianteController::class);
        Route::patch('/estudiantes/{estudiante}/toggle-pase', [EstudianteController::class, 'togglePase']);
    });

    // ---------------- ADMIN + EMPRESARIO (solo lectura) ----------------
    Route::middleware('rol:admin,empresario')->group(function () {
        Route::get('/estudiantes/buscar/{documento}', [EstudianteController::class, 'buscarPorDocumento']);
        Route::get('/estudiantes/{estudiante}/hoja-vida', [HojaVidaController::class, 'ver']);
        Route::get('/estudiantes/{estudiante}/hoja-vida/pdf', [HojaVidaController::class, 'pdf']);
    });

    // ---------------- ESTUDIANTE ----------------
    Route::middleware('rol:estudiante')->group(function () {
        // Hoja de vida / perfil profesional (RF05, RF06)
        Route::get('/hoja-vida', [HojaVidaController::class, 'mia']);
        Route::get('/hoja-vida/pdf', [HojaVidaController::class, 'pdfMio']);
        Route::put('/perfil', [PerfilController::class, 'actualizarPerfil']);
        Route::post('/perfil/hoja-vida', [PerfilController::class, 'subirHojaVida']);

        // Experiencias universitarias y evidencias (RF05)
        Route::post('/experiencias', [PerfilController::class, 'storeExperiencia']);
        Route::put('/experiencias/{id}', [PerfilController::class, 'updateExperiencia']);
        Route::delete('/experiencias/{id}', [PerfilController::class, 'destroyExperiencia']);
        Route::post('/experiencias/{id}/evidencias', [PerfilController::class, 'subirEvidencia']);
        Route::delete('/evidencias/{id}', [PerfilController::class, 'destroyEvidencia']);

        // Pasantías y formatos de asistencia del estudiante (RF07)
        Route::get('/pasantias/estudiante', [PasantiaController::class, 'getEstudiantePasantias']);
        Route::post('/pasantias/asistencias', [PasantiaController::class, 'storeAsistencia']);
    });

    // ---------------- EMPRESARIO ----------------
    Route::middleware('rol:empresario')->group(function () {
        Route::get('/pasantias/empresario', [PasantiaController::class, 'getPasantesEmpresario']);
        Route::post('/pasantias/vincular', [PasantiaController::class, 'vincular']);
        Route::patch('/pasantias/asistencias/{id}/aprobar', [PasantiaController::class, 'aprobarAsistencia']);
    });

    // Descarga del Formato Oficial de Asistencia en PDF (Admin, Estudiante o Empresario autorizado)
    Route::get('/pasantias/{id}/asistencia-pdf', [PasantiaController::class, 'asistenciaPdf']);
});