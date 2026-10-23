import api from './axios'

// Convierte una ruta guardada (/storage/...) en URL absoluta del backend
export const urlArchivo = (ruta) => {
  if (!ruta) return null
  if (/^https?:\/\//i.test(ruta)) return ruta
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api\/?$/, '')
  return `${base}${ruta}`
}

// Descarga un PDF protegido por token (Sanctum) y lo guarda en el equipo
export async function descargarPdf(endpoint, nombreArchivo) {
  const res = await api.get(endpoint, { responseType: 'blob' })
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = nombreArchivo
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.URL.revokeObjectURL(url)
}

// Un pase está habilitado si su estado es 'habilitado' (o 'activo' en datos antiguos)
export const esPaseHabilitado = (estado) =>
  ['habilitado', 'activo'].includes(String(estado || '').toLowerCase())
