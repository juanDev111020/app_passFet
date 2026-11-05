import React from 'react'
import { normalizarError } from '../utils/validationHelper'

/**
 * Componente que muestra el mini letrero de validación / regla de campo
 * estilo: text-xs text-red-600 mt-1 font-semibold
 */
export default function ReglaInput({ mensaje, errorServidor, touched = true }) {
  const textoAMostrar = errorServidor ? normalizarError(errorServidor) : mensaje

  if (!textoAMostrar) return null

  return (
    <p className="text-xs text-red-600 mt-1 font-semibold tracking-tight transition-all">
      {textoAMostrar}
    </p>
  )
}
