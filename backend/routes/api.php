<?php

use App\Http\Controllers\Api\AuthController;
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
});