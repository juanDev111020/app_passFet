// Helper para normalizar y formatear validaciones y límites en toda la plataforma PASSFET

/**
 * Normaliza mensajes de error de backend (evita mostrar "validation.min.string", etc.)
 */
export const normalizarError = (error) => {
  if (!error) return ''
  const str = Array.isArray(error) ? error[0] : String(error)

  if (str.includes('validation.min.string') || str.includes('min.string')) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }
  if (str.includes('validation.max.string') || str.includes('max.string')) {
    return 'El campo no debe superar el límite de caracteres.'
  }
  if (str.includes('validation.required')) {
    return 'Este campo es obligatorio.'
  }
  if (str.includes('validation.email')) {
    return 'Debe ingresar un correo electrónico válido.'
  }
  if (str.includes('validation.unique')) {
    return 'Este dato ya se encuentra registrado en el sistema.'
  }
  if (str.includes('validation.regex')) {
    return 'El formato ingresado no cumple con las reglas del campo.'
  }
  if (str.includes('validation.numeric') || str.includes('validation.integer')) {
    return 'Este campo debe ser numérico.'
  }
  if (str.includes('validation.between')) {
    return 'El valor ingresado está fuera del rango permitido.'
  }
  return str
}

/**
 * Filtros de entrada en tiempo real para evitar caracteres inválidos
 */
export const filtrarSoloNumeros = (valor, maxLen = 10) => {
  return String(valor || '').replace(/\D/g, '').slice(0, maxLen)
}

export const filtrarSoloLetras = (valor, maxLen = 50) => {
  // Letras, espacios y acentos latinos
  return String(valor || '').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').slice(0, maxLen)
}

export const filtrarCodigoEstudiantil = (valor, maxLen = 10) => {
  return String(valor || '').replace(/[^a-zA-Z0-9\-]/g, '').slice(0, maxLen)
}

export const filtrarPassword = (valor, maxLen = 20) => {
  return String(valor || '').slice(0, maxLen)
}

/**
 * Reglas informativas y de validación para mini letreros (<p className="text-xs text-red-600 mt-1 font-semibold">)
 */
export const obtenerReglaCampo = (tipo, valor, errorServidor = null, tocado = false) => {
  if (errorServidor) {
    return normalizarError(errorServidor)
  }

  // Si no está siendo llenado ni tiene foco/tocado, no mostrar nada
  if (!tocado && (valor === undefined || valor === '')) {
    return null
  }

  const valStr = String(valor ?? '').trim()

  switch (tipo) {
    case 'documento':
      if (!valStr) return 'Solo números (mínimo 5, máximo 10 dígitos).'
      if (!/^\d+$/.test(valStr)) return 'Solo se permiten números.'
      if (valStr.length < 5) return `Solo números: faltan ${5 - valStr.length} dígitos (máx. 10).`
      if (valStr.length > 10) return 'Máximo 10 dígitos permitidos.'
      return null

    case 'nombre':
    case 'apellido':
      if (!valStr) return 'Solo letras y espacios (máx. 50 caracteres).'
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valStr)) return 'Solo se permiten letras y espacios.'
      if (valStr.length < 2) return 'Debe contener al menos 2 letras.'
      return null

    case 'password':
      if (!valStr) return 'Mínimo 8 y máximo 20 caracteres.'
      if (valStr.length < 8) return `Mínimo 8 caracteres (actual: ${valStr.length}).`
      if (valStr.length > 20) return `Máximo 20 caracteres (actual: ${valStr.length}).`
      return null

    case 'password_login':
      if (!valStr) return 'Mínimo 8 y máximo 20 caracteres.'
      if (valStr.length < 8) return `Mínimo 8 caracteres (actual: ${valStr.length}).`
      return null

    case 'email':
      if (!valStr) return 'Correo requerido (ej. usuario@passfet.edu.co).'
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valStr)) return 'Formato de correo electrónico inválido.'
      return null

    case 'codigo':
      if (!valStr) return 'Código de estudiante (máximo 10 caracteres).'
      if (valStr.length < 4) return `Mínimo 4 caracteres (actual: ${valStr.length}).`
      return null

    case 'telefono':
      if (!valStr) return null // Teléfono puede ser opcional
      if (!/^\d+$/.test(valStr)) return 'Solo se permiten números.'
      if (valStr.length < 7) return `Debe tener entre 7 y 10 dígitos (actual: ${valStr.length}).`
      return null

    case 'semestre':
      const sem = parseInt(valStr, 10)
      if (isNaN(sem) || sem < 1 || sem > 10) return 'El semestre debe estar entre 1 y 10.'
      return null

    case 'horas':
      const hrs = parseInt(valStr, 10)
      if (isNaN(hrs) || hrs < 1 || hrs > 42) return 'Horas por reporte: entre 1 y 42 horas.'
      return null

    case 'cargo':
      if (!valStr) return 'Solo letras y espacios (máx. 100 caracteres).'
      if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(valStr)) return 'Solo se permiten letras y espacios.'
      return null

    default:
      return null
  }
}

/**
 * Convierte fechas del backend (ej. "2026-11-09T00:00:00.000000Z" o "2026-11-09") a formato legible dd/mm/yyyy
 */
export const formatearFecha = (fecha) => {
  if (!fecha) return ''
  const limpia = String(fecha).split('T')[0].trim()
  const partes = limpia.split('-')
  if (partes.length === 3) {
    const [y, m, d] = partes
    return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`
  }
  return limpia
}
