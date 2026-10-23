import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { esPaseHabilitado } from '../api/archivos'

export default function PaseEstudiante() {
  const { user, logout } = useAuth()
  const [perfil, setPerfil] = useState(user)
  const [actualizando, setActualizando] = useState(false)
  const [horaActual, setHoraActual] = useState(new Date())

  // Reloj en tiempo real para el pase digital
  useEffect(() => {
    const timer = setInterval(() => setHoraActual(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Recargar datos actualizados del estudiante y su pase
  const recargarPase = async () => {
    setActualizando(true)
    try {
      const res = await api.get('/auth/me')
      setPerfil(res.data.user)
    } catch (err) {
      console.error('Error al actualizar pase:', err)
    } finally {
      setActualizando(false)
    }
  }

  const estudiante = perfil?.estudiante
  const pase = estudiante?.pase
  const esHabilitado = esPaseHabilitado(pase?.estado)

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 flex flex-col font-sans selection:bg-[#08940c] selection:text-white">
      {/* Barra de navegación superior (Blanco y Verde FET) */}
      <header className="border-b border-[#dfe6e1] bg-white sticky top-0 z-50 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#08940c] to-[#067a0a] flex items-center justify-center font-bold text-white shadow-md shadow-[#08940c]/25">
              FET
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#14201a] leading-tight">PassFet</h1>
              <p className="text-xs text-[#5f6b64] font-medium">Disponibilidad de Pasantías</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/estudiante/pase"
              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#067a0a] bg-[#e8f8ea] border border-[#08940c]/30"
            >
              Mi Pase FET
            </Link>
            <Link
              to="/estudiante/perfil"
              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#5f6b64] hover:text-[#08940c] hover:bg-[#e8f8ea] transition-all"
            >
              Hoja de Vida
            </Link>
            <button
              onClick={recargarPase}
              disabled={actualizando}
              title="Actualizar estado"
              className="p-2 text-[#5f6b64] hover:text-[#08940c] hover:bg-[#e8f8ea] rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
            >
              <svg
                className={`w-4 h-4 ${actualizando ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-red-50 border border-[#dfe6e1] hover:border-red-200 transition-all shadow-sm cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido principal - Mobile First */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 sm:p-6 flex flex-col justify-center items-center">
        {/* Tarjeta Digital PassFet en Blanco y Verde FET */}
        <div
          className={`w-full bg-white rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden transition-all duration-500 border ${
            esHabilitado
              ? 'border-[#08940c]/40 ring-4 ring-[#08940c]/10 shadow-[#08940c]/10'
              : 'border-red-400/50 ring-4 ring-red-400/10 shadow-red-500/10'
          }`}
        >
          {/* Franja superior decorativa institucional */}
          <div
            className={`h-2.5 w-full absolute top-0 left-0 ${
              esHabilitado
                ? 'bg-gradient-to-r from-[#08940c] via-[#067a0a] to-[#08940c]'
                : 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600'
            }`}
          />

          {/* Encabezado del Pase */}
          <div className="flex items-start justify-between border-b border-[#dfe6e1] pb-4 mb-5 pt-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#e8f8ea] border border-[#08940c]/20 flex items-center justify-center text-[#08940c] font-black text-sm tracking-wider shadow-inner">
                FET
              </div>
              <div>
                <h2 className="text-[11px] uppercase tracking-wider font-bold text-[#5f6b64]">Fundación FET</h2>
                <p className="text-sm font-extrabold text-[#14201a] tracking-tight">Pase de Vinculación y Pasantías</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#067a0a] bg-[#e8f8ea] px-2.5 py-1 rounded-lg border border-[#08940c]/20">
              {pase?.periodo_academico || '2026-2'}
            </span>
          </div>

          {/* Indicador de Disponibilidad Condicional (Verde / Rojo) */}
          <div
            className={`w-full py-3.5 px-4 rounded-2xl mb-6 flex items-center justify-between border transition-all ${
              esHabilitado
                ? 'bg-[#e8f8ea] border-[#08940c]/30 text-[#067a0a]'
                : 'bg-[#fdecea] border-red-300 text-[#d93025]'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="relative flex h-3.5 w-3.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    esHabilitado ? 'bg-[#08940c]' : 'bg-red-500'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                    esHabilitado ? 'bg-[#08940c]' : 'bg-red-600'
                  }`}
                />
              </span>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider opacity-75">Estado de Pasantía</p>
                <p className="text-sm font-extrabold tracking-wide uppercase">
                  {esHabilitado ? 'Habilitado · Disponible' : 'Inhabilitado · No Disponible'}
                </p>
              </div>
            </div>
            <div>
              {esHabilitado ? (
                <div className="w-8 h-8 rounded-full bg-[#08940c]/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#08940c]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-red-500/15 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {/* Datos del Estudiante */}
          <div className="space-y-3.5 mb-6">
            <div>
              <span className="text-[10px] font-bold text-[#5f6b64] uppercase tracking-wider">Estudiante</span>
              <p className="text-lg font-extrabold text-[#14201a] capitalize leading-snug">
                {perfil?.nombres} {perfil?.apellidos}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3">
                <span className="text-[10px] text-[#5f6b64] uppercase font-bold">Documento</span>
                <p className="text-sm font-bold text-[#14201a] font-mono mt-0.5">
                  {perfil?.numero_documento || 'Sin registrar'}
                </p>
              </div>
              <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3">
                <span className="text-[10px] text-[#5f6b64] uppercase font-bold">Cód. Estudiantil</span>
                <p className="text-sm font-bold text-[#14201a] font-mono mt-0.5">
                  {estudiante?.codigo_estudiantil || 'N/A'}
                </p>
              </div>
            </div>

            <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3">
              <span className="text-[10px] text-[#5f6b64] uppercase font-bold">Programa Académico</span>
              <p className="text-sm font-bold text-[#08940c] mt-0.5">
                {estudiante?.programa?.nombre || 'Ingeniería de Software'}
              </p>
            </div>
          </div>

          {/* Código QR / Visualización Digital */}
          <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-2xl p-4 flex flex-col items-center justify-center relative shadow-inner">
            <div className="w-36 h-36 bg-white p-2.5 rounded-xl border border-[#dfe6e1] shadow-sm flex items-center justify-center">
              <svg className="w-full h-full text-[#14201a]" viewBox="0 0 100 100" fill="currentColor">
                <path d="M0 0h30v30H0V0zm10 10h10v10H10V10zm60-10h30v30H70V0zm10 10h10v10H80V10zM0 70h30v30H0V70zm10 10h10v10H10V80zm35-80h10v10H45V0zm0 20h10v10H45V20zm0 20h10v10H45V40zm-20 5h10v10H25V45zm40 0h10v10H65V45zm-20 20h10v10H45V65zm20 0h10v10H65V65zm20 0h10v10H85V65zm-20 20h10v10H65V85zm20 0h10v10H85V85zm-45 0h10v10H40V85z" />
              </svg>
            </div>
            <p className="text-[11px] font-mono text-[#5f6b64] mt-3 text-center truncate max-w-xs font-semibold">
              UUID: {pase?.codigo_qr || '0000-PASS-FET-2026'}
            </p>
            <div className="mt-2 text-center">
              <span className="text-[10px] text-[#5f6b64] uppercase tracking-widest block font-bold">Fecha / Hora de Consulta</span>
              <span className="text-xs font-mono font-extrabold text-[#14201a]">
                {horaActual.toLocaleTimeString()} · {horaActual.toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Enlace directo a Hoja de Vida */}
          <div className="mt-5 space-y-2">
            <Link
              to="/estudiante/perfil"
              className="block w-full text-center py-2.5 px-4 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold shadow-md shadow-[#08940c]/25 transition-all"
            >
              Gestionar Mi Hoja de Vida y Experiencias 📄
            </Link>
            <p className="text-[11px] text-[#5f6b64] text-center">
              {esHabilitado
                ? 'Cumples con los requisitos para postularte a pasantías empresariales.'
                : 'Actualmente cursas pasantía o estás inhabilitado por la universidad.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}