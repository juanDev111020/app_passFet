import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { esPaseHabilitado } from '../api/archivos'
import HojaVidaVista from '../components/HojaVidaVista'

export default function DashboardAdmin() {
  const { user, logout } = useAuth()
  const [estudiantes, setEstudiantes] = useState([])
  const [programas, setProgramas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [notificacion, setNotificacion] = useState(null)

  // Modales
  const [modalRegistro, setModalRegistro] = useState(false)
  const [modalEdicion, setModalEdicion] = useState(false)
  const [estudianteEditando, setEstudianteEditando] = useState(null)
  const [estudianteHvModal, setEstudianteHvModal] = useState(null)

  // Módulo de Verificación Rápida (RF05)
  const [docBusqueda, setDocBusqueda] = useState('')
  const [resultadoBusqueda, setResultadoBusqueda] = useState(null)
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState('')

  // Formulario de registro
  const [nuevoEstudiante, setNuevoEstudiante] = useState({
    nombres: '',
    apellidos: '',
    numero_documento: '',
    email: '',
    password: '',
    programa_id: '',
    codigo_estudiantil: '',
    semestre: 1,
    telefono: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [erroresForm, setErroresForm] = useState({})

  // Cargar estudiantes y programas
  const cargarDatos = async () => {
    try {
      const [resEstudiantes, resProgramas] = await Promise.all([
        api.get('/estudiantes'),
        api.get('/programas'),
      ])
      setEstudiantes(resEstudiantes.data)
      setProgramas(resProgramas.data)
      if (resProgramas.data.length > 0 && !nuevoEstudiante.programa_id) {
        setNuevoEstudiante((prev) => ({ ...prev, programa_id: resProgramas.data[0].id }))
      }
    } catch (err) {
      mostrarNotificacion('Error al cargar datos del servidor.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const mostrarNotificacion = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  // RF03 y RF08 - Alternar disponibilidad del pase con regla de 24 horas
  const handleTogglePase = async (estudiante) => {
    try {
      const res = await api.patch(`/estudiantes/${estudiante.id}/toggle-pase`)
      mostrarNotificacion(`Disponibilidad cambiada a: ${res.data.estado}`, 'exito')
      setEstudiantes((prev) =>
        prev.map((e) =>
          e.id === estudiante.id
            ? { ...e, pase: { ...e.pase, estado: res.data.estado } }
            : e
        )
      )
    } catch (err) {
      const msg = err.response?.data?.message || 'No se pudo cambiar el estado del pase.'
      mostrarNotificacion(msg, 'error')
    }
  }

  // RF02 - Registrar nuevo estudiante
  const handleCrearEstudiante = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErroresForm({})
    try {
      await api.post('/estudiantes', nuevoEstudiante)
      mostrarNotificacion('Estudiante registrado exitosamente.', 'exito')
      setModalRegistro(false)
      setNuevoEstudiante({
        nombres: '',
        apellidos: '',
        numero_documento: '',
        email: '',
        password: '',
        programa_id: programas[0]?.id || '',
        codigo_estudiantil: '',
        semestre: 1,
        telefono: '',
      })
      cargarDatos()
    } catch (err) {
      if (err.response?.data?.errors) {
        setErroresForm(err.response.data.errors)
      } else {
        mostrarNotificacion(err.response?.data?.message || 'Error al registrar estudiante.', 'error')
      }
    } finally {
      setGuardando(false)
    }
  }

  // RF02 - Actualizar estudiante
  const handleActualizarEstudiante = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErroresForm({})
    try {
      await api.put(`/estudiantes/${estudianteEditando.id}`, {
        nombres: estudianteEditando.user.nombres,
        apellidos: estudianteEditando.user.apellidos,
        numero_documento: estudianteEditando.user.numero_documento,
        email: estudianteEditando.user.email,
        programa_id: estudianteEditando.programa_id,
        codigo_estudiantil: estudianteEditando.codigo_estudiantil,
        semestre: estudianteEditando.semestre,
        telefono: estudianteEditando.telefono,
      })
      mostrarNotificacion('Estudiante actualizado exitosamente.', 'exito')
      setModalEdicion(false)
      cargarDatos()
    } catch (err) {
      if (err.response?.data?.errors) {
        setErroresForm(err.response.data.errors)
      } else {
        mostrarNotificacion('Error al actualizar estudiante.', 'error')
      }
    } finally {
      setGuardando(false)
    }
  }

  // RF02 - Eliminar estudiante
  const handleEliminarEstudiante = async (id, nombre) => {
    if (!window.confirm(`¿Estás seguro de eliminar al estudiante "${nombre}"? Esta acción no se puede deshacer.`)) {
      return
    }
    try {
      await api.delete(`/estudiantes/${id}`)
      mostrarNotificacion('Estudiante eliminado correctamente.', 'exito')
      setEstudiantes((prev) => prev.filter((e) => e.id !== id))
    } catch (err) {
      mostrarNotificacion('Error al eliminar estudiante.', 'error')
    }
  }

  // RF05 - Verificación rápida por documento
  const handleBuscarDocumento = async (e) => {
    e.preventDefault()
    if (!docBusqueda.trim()) return
    setBuscando(true)
    setErrorBusqueda('')
    setResultadoBusqueda(null)
    try {
      const res = await api.get(`/estudiantes/buscar/${docBusqueda.trim()}`)
      setResultadoBusqueda(res.data)
    } catch (err) {
      setErrorBusqueda('No se encontró ningún estudiante con ese número de documento.')
    } finally {
      setBuscando(false)
    }
  }

  // Filtrar estudiantes
  const estudiantesFiltrados = estudiantes.filter((est) => {
    const texto = `${est.user?.nombres} ${est.user?.apellidos} ${est.user?.numero_documento} ${est.codigo_estudiantil} ${est.programa?.nombre}`.toLowerCase()
    return texto.includes(filtro.toLowerCase())
  })

  // Estadísticas
  const totalEstudiantes = estudiantes.length
  const pasesActivos = estudiantes.filter((e) => (e.pase?.estado || 'activo').toLowerCase() === 'activo').length
  const pasesBloqueados = estudiantes.filter((e) => (e.pase?.estado || '').toLowerCase() === 'bloqueado').length

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 flex flex-col font-sans selection:bg-[#08940c] selection:text-white">
      {/* Toast Notificación */}
      {notificacion && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notificacion.tipo === 'exito'
                ? 'bg-white border-[#08940c] text-[#067a0a]'
                : 'bg-white border-red-500 text-red-600'
            }`}
          >
            <span className="font-bold">{notificacion.tipo === 'exito' ? '✓' : '✕'}</span>
            <p className="text-sm font-semibold">{notificacion.mensaje}</p>
          </div>
        </div>
      )}

      {/* Barra de navegación superior (Blanco y Verde FET) */}
      <header className="border-b border-[#dfe6e1] bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#08940c] to-[#067a0a] flex items-center justify-center font-bold text-white shadow-md shadow-[#08940c]/25">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="16" rx="3" />
                <circle cx="9" cy="11" r="2.5" />
                <path d="M14 10h4M14 14h4M6 16c.8-1.5 2-2 3-2s2.2.5 3 2" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#14201a] leading-tight">PassFet Admin</h1>
              <p className="text-xs text-[#5f6b64] font-medium">Panel de Control Institucional</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm bg-[#f8faf9] px-3.5 py-1.5 rounded-xl border border-[#dfe6e1]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#08940c] animate-pulse"></span>
              <span className="text-[#5f6b64]">Admin:</span>
              <span className="font-bold text-[#14201a]">{user?.nombres}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-red-50 border border-[#dfe6e1] hover:border-red-200 transition-all shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Cerrar sesión</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenedor Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-7">
        {/* Tarjetas de Estadísticas */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-white border border-[#dfe6e1] p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#5f6b64]">Total Estudiantes</p>
              <h3 className="text-2xl font-extrabold text-[#14201a] mt-1">{totalEstudiantes}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white border border-[#dfe6e1] p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#08940c]">Pases Activos</p>
              <h3 className="text-2xl font-extrabold text-[#08940c] mt-1">{pasesActivos}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#e8f8ea] text-[#08940c] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="bg-white border border-[#dfe6e1] p-5 rounded-2xl flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#d93025]">Pases Bloqueados</p>
              <h3 className="text-2xl font-extrabold text-[#d93025] mt-1">{pasesBloqueados}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#fdecea] text-[#d93025] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>
        </section>

        {/* RF05 - Módulo de Verificación Rápida de Pase */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[#08940c] text-xs font-extrabold uppercase tracking-widest mb-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Módulo de Verificación Rápida (RF05)</span>
            </div>
            <h2 className="text-xl font-extrabold text-[#14201a] mb-1.5">Comprobar Validez del Pase</h2>
            <p className="text-sm text-[#5f6b64] mb-5">
              Ingresa el documento de identidad del estudiante para consultar al instante si tiene ingreso permitido o bloqueado.
            </p>

            <form onSubmit={handleBuscarDocumento} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Número de documento..."
                  value={docBusqueda}
                  onChange={(e) => setDocBusqueda(e.target.value)}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-4 py-3 text-sm text-[#14201a] placeholder-[#5f6b64] focus:outline-none transition-all font-mono"
                />
              </div>
              <button
                type="submit"
                disabled={buscando || !docBusqueda.trim()}
                className="px-6 py-3 rounded-xl bg-[#08940c] hover:bg-[#067a0a] disabled:opacity-50 text-white text-sm font-bold shadow-lg shadow-[#08940c]/25 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {buscando ? (
                  <span className="animate-spin text-lg">⟳</span>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
                <span>Verificar Pase</span>
              </button>
            </form>

            {/* Error de búsqueda */}
            {errorBusqueda && (
              <div className="mt-4 p-3.5 bg-[#fdecea] border border-red-200 rounded-xl text-[#d93025] text-sm font-medium flex items-center gap-2">
                <span>✕</span>
                <p>{errorBusqueda}</p>
              </div>
            )}

            {/* Resultado de Búsqueda */}
            {resultadoBusqueda && (() => {
              const resActivo = (resultadoBusqueda.pase?.estado || (resultadoBusqueda.user?.activo ? 'Activo' : 'Bloqueado')).toLowerCase() === 'activo'
              return (
                <div
                  className={`mt-5 p-5 rounded-2xl border transition-all ${
                    resActivo
                      ? 'bg-[#e8f8ea] border-[#08940c]/40 text-[#067a0a]'
                      : 'bg-[#fdecea] border-red-300 text-[#d93025]'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[11px] font-mono font-bold opacity-75">
                        Doc: {resultadoBusqueda.user?.numero_documento} · Cód: {resultadoBusqueda.codigo_estudiantil}
                      </span>
                      <h4 className="text-lg font-extrabold text-[#14201a] capitalize">
                        {resultadoBusqueda.user?.nombres} {resultadoBusqueda.user?.apellidos}
                      </h4>
                      <p className="text-xs text-[#5f6b64]">
                        Programa: <span className="font-bold text-[#08940c]">{resultadoBusqueda.programa?.nombre}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className={`px-4 py-2 rounded-xl border flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider ${
                          resActivo
                            ? 'bg-white border-[#08940c] text-[#067a0a]'
                            : 'bg-white border-red-400 text-[#d93025]'
                        }`}
                      >
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            resActivo ? 'bg-[#08940c] animate-pulse' : 'bg-red-500'
                          }`}
                        />
                        <span>{resActivo ? 'Pase Activo (Permitido)' : 'Pase Bloqueado (Restringido)'}</span>
                      </div>

                      <button
                        onClick={() => setResultadoBusqueda(null)}
                        className="text-[#5f6b64] hover:text-slate-900 p-2 font-bold cursor-pointer"
                        title="Cerrar verificación"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        </section>

        {/* Sección de Gestión de Estudiantes (RF02) */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
          {/* Barra superior de la tabla: Búsqueda y Botón Crear */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#14201a]">Listado de Estudiantes</h2>
              <p className="text-sm text-[#5f6b64]">Gestiona, actualiza y controla el acceso institucional de cada estudiante.</p>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filtrar por nombre, doc o programa..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  className="bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2 text-sm text-[#14201a] placeholder-[#5f6b64] focus:outline-none transition-all w-64"
                />
              </div>

              <button
                onClick={() => setModalRegistro(true)}
                className="px-4 py-2 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-sm font-bold shadow-md shadow-[#08940c]/25 transition-all flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                <span>Nuevo Estudiante</span>
              </button>
            </div>
          </div>

          {/* Tabla de Estudiantes */}
          {cargando ? (
            <div className="py-16 text-center text-[#5f6b64]">
              <span className="animate-spin text-2xl inline-block mb-2 text-[#08940c]">⟳</span>
              <p className="font-medium">Cargando información de estudiantes...</p>
            </div>
          ) : estudiantesFiltrados.length === 0 ? (
            <div className="py-12 text-center text-[#5f6b64] bg-[#f8faf9] rounded-2xl border border-[#dfe6e1]">
              <p className="text-base font-bold text-[#14201a]">No se encontraron estudiantes</p>
              <p className="text-xs text-[#5f6b64] mt-1">Prueba con otro término de búsqueda o añade un nuevo estudiante.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#dfe6e1] bg-white">
              <table className="w-full text-left text-sm text-[#14201a]">
                <thead className="bg-[#f8faf9] text-[#5f6b64] uppercase text-[11px] tracking-wider border-b border-[#dfe6e1]">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Documento</th>
                    <th className="py-3.5 px-4 font-bold">Estudiante</th>
                    <th className="py-3.5 px-4 font-bold">Programa</th>
                    <th className="py-3.5 px-4 font-bold">Cód. Estudiantil</th>
                    <th className="py-3.5 px-4 font-bold text-center">Estado del Pase</th>
                    <th className="py-3.5 px-4 font-bold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dfe6e1]">
                  {estudiantesFiltrados.map((est) => {
                    const esActivo = esPaseHabilitado(est.pase?.estado || (est.user?.activo ? 'habilitado' : 'inhabilitado'))
                    const estadoPase = esActivo ? 'Habilitado' : 'Inhabilitado'

                    return (
                      <tr key={est.id} className="hover:bg-[#f8faf9] transition-colors">
                        <td className="py-4 px-4 font-mono font-bold text-slate-700">
                          {est.user?.numero_documento}
                        </td>
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#14201a] capitalize">
                            {est.user?.nombres} {est.user?.apellidos}
                          </div>
                          <div className="text-xs text-[#5f6b64]">{est.user?.email}</div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs bg-[#f8faf9] px-2.5 py-1 rounded-md text-[#14201a] font-medium border border-[#dfe6e1]">
                            {est.programa?.nombre || 'Sin programa'}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-mono text-xs font-semibold text-[#5f6b64]">
                          {est.codigo_estudiantil}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold ${
                              esActivo
                                ? 'bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/30'
                                : 'bg-[#fdecea] text-[#d93025] border border-red-300'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${esActivo ? 'bg-[#08940c]' : 'bg-red-500'}`} />
                            {estadoPase}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* RF03 / RF08 - Botón Habilitar / Inhabilitar */}
                            <button
                              onClick={() => handleTogglePase(est)}
                              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                                esActivo
                                  ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                                  : 'bg-[#e8f8ea] hover:bg-[#d5f3d8] text-[#067a0a] border-[#08940c]/40'
                              }`}
                              title={esActivo ? 'Inhabilitar pasante (Regla 24h)' : 'Habilitar pasante'}
                            >
                              {esActivo ? 'Inhabilitar' : 'Habilitar'}
                            </button>

                            {/* Botón Ver Hoja de Vida (Solo Lectura) */}
                            <button
                              onClick={() => setEstudianteHvModal(est)}
                              className="px-2.5 py-1 text-xs font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-xl transition-colors border border-[#08940c]/30 cursor-pointer flex items-center gap-1"
                              title="Ver Hoja de Vida (Solo Lectura)"
                            >
                              <span>📄</span>
                              <span>Hoja de Vida</span>
                            </button>

                            {/* Botón Editar */}
                            <button
                              onClick={() => {
                                setEstudianteEditando({ ...est })
                                setModalEdicion(true)
                              }}
                              className="p-1.5 text-[#5f6b64] hover:text-[#08940c] hover:bg-[#e8f8ea] rounded-xl transition-colors border border-transparent hover:border-[#08940c]/30 cursor-pointer"
                              title="Editar estudiante"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>

                            {/* Botón Eliminar */}
                            <button
                              onClick={() => handleEliminarEstudiante(est.id, `${est.user?.nombres} ${est.user?.apellidos}`)}
                              className="p-1.5 text-[#5f6b64] hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-200 cursor-pointer"
                              title="Eliminar estudiante"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL: Registrar Nuevo Estudiante (RF02) */}
      {modalRegistro && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#14201a]">Registrar Nuevo Estudiante</h3>
                <p className="text-xs text-[#5f6b64]">Ingresa la información básica y académica del estudiante.</p>
              </div>
              <button
                onClick={() => setModalRegistro(false)}
                className="text-[#5f6b64] hover:text-slate-900 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCrearEstudiante} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={nuevoEstudiante.nombres}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, nombres: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Ej. Carlos Andres"
                  />
                  {erroresForm.nombres && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.nombres[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={nuevoEstudiante.apellidos}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, apellidos: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Ej. Pérez Gómez"
                  />
                  {erroresForm.apellidos && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.apellidos[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Número Documento</label>
                  <input
                    type="text"
                    required
                    value={nuevoEstudiante.numero_documento}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, numero_documento: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                    placeholder="Ej. 1076904428"
                  />
                  {erroresForm.numero_documento && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.numero_documento[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Código Estudiantil</label>
                  <input
                    type="text"
                    required
                    value={nuevoEstudiante.codigo_estudiantil}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, codigo_estudiantil: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                    placeholder="Ej. EST2026-001"
                  />
                  {erroresForm.codigo_estudiantil && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.codigo_estudiantil[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Correo Institucional</label>
                  <input
                    type="email"
                    required
                    value={nuevoEstudiante.email}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, email: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="estudiante@passfet.edu.co"
                  />
                  {erroresForm.email && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.email[0]}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Contraseña Inicial</label>
                  <input
                    type="password"
                    required
                    value={nuevoEstudiante.password}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, password: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Mínimo 6 caracteres"
                  />
                  {erroresForm.password && <p className="text-xs text-red-600 mt-1 font-semibold">{erroresForm.password[0]}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Programa Académico</label>
                  <select
                    value={nuevoEstudiante.programa_id}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, programa_id: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  >
                    {programas.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.nombre} ({prog.codigo})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Semestre</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={nuevoEstudiante.semestre}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, semestre: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dfe6e1]">
                <button
                  type="button"
                  onClick={() => setModalRegistro(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Registrando...' : 'Registrar Estudiante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Estudiante (RF02) */}
      {modalEdicion && estudianteEditando && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-[#14201a]">Editar Información del Estudiante</h3>
                <p className="text-xs text-[#5f6b64]">Actualiza los datos personales y académicos.</p>
              </div>
              <button
                onClick={() => setModalEdicion(false)}
                className="text-[#5f6b64] hover:text-slate-900 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleActualizarEstudiante} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Nombres</label>
                  <input
                    type="text"
                    required
                    value={estudianteEditando.user.nombres}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, nombres: e.target.value },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Apellidos</label>
                  <input
                    type="text"
                    required
                    value={estudianteEditando.user.apellidos}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, apellidos: e.target.value },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Número Documento</label>
                  <input
                    type="text"
                    required
                    value={estudianteEditando.user.numero_documento}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, numero_documento: e.target.value },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Código Estudiantil</label>
                  <input
                    type="text"
                    required
                    value={estudianteEditando.codigo_estudiantil}
                    onChange={(e) =>
                      setEstudianteEditando({ ...estudianteEditando, codigo_estudiantil: e.target.value })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    value={estudianteEditando.user.email}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, email: e.target.value },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Programa Académico</label>
                  <select
                    value={estudianteEditando.programa_id}
                    onChange={(e) =>
                      setEstudianteEditando({ ...estudianteEditando, programa_id: parseInt(e.target.value) })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  >
                    {programas.map((prog) => (
                      <option key={prog.id} value={prog.id}>
                        {prog.nombre} ({prog.codigo})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#dfe6e1]">
                <button
                  type="button"
                  onClick={() => setModalEdicion(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: Ver Hoja de Vida en Solo Lectura */}
      {estudianteHvModal && (
        <HojaVidaVista
          estudiante={estudianteHvModal}
          onCerrar={() => setEstudianteHvModal(null)}
        />
      )}
    </div>
  )
}