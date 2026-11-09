<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RolMiddleware
{
    /**
     * Restringe la ruta a uno o varios roles. Uso: ->middleware('rol:admin,empresario')
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array(strtolower((string) $user->rol), $roles, true)) {
            return response()->json(['message' => 'No tienes permisos para realizar esta acción.'], 403);
        }

        return $next($request);
    }
}
