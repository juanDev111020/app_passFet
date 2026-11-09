import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { esPaseHabilitado, urlArchivo, descargarPdf } from '../api/archivos'
import HojaVidaVista from '../components/HojaVidaVista'
import ReglaInput from '../components/ReglaInput'
import { comprimirImagen } from '../utils/imageCompressor'
import {
  filtrarSoloNumeros,
  filtrarSoloLetras,
  filtrarCodigoEstudiantil,
  filtrarPassword,
  obtenerReglaCampo,
  normalizarError,
} from '../utils/validationHelper'

export default function DashboardAdmin() {
  const { user, logout } = useAuth()
  const [estudiantes, setEstudiantes] = useState([])
  const [programas, setProgramas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState('')
  const [notificacion, setNotificacion] = useState(null)
  const [focoCampo, setFocoCampo] = useState('')

  // Modales
  const [modalRegistro, setModalRegistro] = useState(false)
  const [modalEdicion, setModalEdicion] = useState(false)
  const [estudianteEditando, setEstudianteEditando] = useState(null)
  const [estudianteHvModal, setEstudianteHvModal] = useState(null)

  // Firma institucional del Administrador
  const [subiendoFirma, setSubiendoFirma] = useState(false)
  const [rotandoFirma, setRotandoFirma] = useState(false)
  const [firmaAdmin, setFirmaAdmin] = useState(user?.firma_digital || null)

  // Seguimiento de pasantías y horas del estudiante
  const [estudianteSeguimiento, setEstudianteSeguimiento] = useState(null)
  const [pasantiasSeguimiento, setPasantiasSeguimiento] = useState([])
  const [cargandoSeguimiento, setCargandoSeguimiento] = useState(false)

  // Modal para revisar, aplicar Check de Habilitado y firmar asistencia por Admin
  const [asistenciaSeleccionada, setAsistenciaSeleccionada] = useState(null)
  const [checkHabilitado, setCheckHabilitado] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [procesandoAsistencia, setProcesandoAsistencia] = useState(false)

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

  // Subir foto de firma del administrador con compresión
  const handleSubirFirma = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFirma(true)
    try {
      const fileComprimido = await comprimirImagen(file, 1200, 0.9)
      const data = new FormData()
      data.append('firma', fileComprimido)
      const res = await api.post('/perfil/firma', data)
      mostrarNotificacion('Foto de firma institucional guardada exitosamente.', 'exito')
      setFirmaAdmin(res.data.firma_digital + '?t=' + Date.now())
    } catch (err) {
      mostrarNotificacion(err.response?.data?.message || 'Error al subir la firma.', 'error')
    } finally {
      setSubiendoFirma(false)
    }
  }

  // Rotar firma del administrador (90°)
  const handleRotarFirma = async () => {
    setRotandoFirma(true)
    try {
      const res = await api.post('/perfil/firma/rotar', { grados: 90 })
      setFirmaAdmin(res.data.firma_digital + '?t=' + Date.now())
      mostrarNotificacion('Firma institucional rotada exitosamente.', 'exito')
    } catch (err) {
      mostrarNotificacion(err.response?.data?.message || 'Error al rotar la firma.', 'error')
    } finally {
      setRotandoFirma(false)
    }
  }

  // Abrir modal de seguimiento de horas y pasantías para un estudiante
  const handleAbrirSeguimiento = async (estudiante) => {
    setEstudianteSeguimiento(estudiante)
    setCargandoSeguimiento(true)
    try {
      const res = await api.get(`/estudiantes/${estudiante.id}/pasantias`)
      setPasantiasSeguimiento(res.data || [])
    } catch (err) {
      mostrarNotificacion('Error al cargar pasantías del estudiante.', 'error')
    } finally {
      setCargandoSeguimiento(false)
    }
  }

  // Guardar aprobación y firma del Administrador / Docente FET en la asistencia
  const handleGuardarAprobacionAdmin = async (estadoAprobacion) => {
    if (estadoAprobacion === 'aprobado' && !checkHabilitado) {
      mostrarNotificacion('Debes marcar el "Check de Habilitación Institucional" para aprobar el formato.', 'error')
      return
    }
    const firmaActual = firmaAdmin || user?.firma_digital
    if (estadoAprobacion === 'aprobado' && !firmaActual) {
      mostrarNotificacion('Debes subir tu foto de firma antes de aprobar formatos de asistencia.', 'error')
      return
    }

    setProcesandoAsistencia(true)
    try {
      await api.patch(`/pasantias/asistencias/${asistenciaSeleccionada.id}/aprobar`, {
        check_habilitado: estadoAprobacion === 'aprobado',
        estado: estadoAprobacion,
        observaciones: observaciones,
      })
      mostrarNotificacion(`Formato ${estadoAprobacion === 'aprobado' ? 'aprobado y firmado institucionalmente' : 'rechazado'} con éxito.`, 'exito')
      setAsistenciaSeleccionada(null)
      if (estudianteSeguimiento) {
        const res = await api.get(`/estudiantes/${estudianteSeguimiento.id}/pasantias`)
        setPasantiasSeguimiento(res.data || [])
      }
    } catch (err) {
      mostrarNotificacion(err.response?.data?.message || 'Error al procesar formato de asistencia.', 'error')
    } finally {
      setProcesandoAsistencia(false)
    }
  }

  // RF02 - Registrar nuevo estudiante
  const handleCrearEstudiante = async (e) => {
    e.preventDefault()
    setGuardando(true)
    setErroresForm({})

    // Validaciones preventivas de negocio
    const erroresPrevios = {}
    if (!nuevoEstudiante.nombres.trim()) erroresPrevios.nombres = ['Los nombres son obligatorios (solo letras).']
    if (!nuevoEstudiante.apellidos.trim()) erroresPrevios.apellidos = ['Los apellidos son obligatorios (solo letras).']
    if (nuevoEstudiante.numero_documento.length < 5) erroresPrevios.numero_documento = ['El documento debe tener entre 5 y 10 dígitos numéricos.']
    if (nuevoEstudiante.password.length < 8 || nuevoEstudiante.password.length > 20) erroresPrevios.password = ['La contraseña debe tener mínimo 8 y máximo 20 caracteres.']
    if (!nuevoEstudiante.codigo_estudiantil.trim()) erroresPrevios.codigo_estudiantil = ['El código estudiantil es obligatorio (máx. 10 caracteres).']

    if (Object.keys(erroresPrevios).length > 0) {
      setErroresForm(erroresPrevios)
      setGuardando(false)
      return
    }

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
        mostrarNotificacion(normalizarError(err.response?.data?.message) || 'Error al registrar estudiante.', 'error')
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

    const erroresPrevios = {}
    if (!estudianteEditando.user.nombres.trim()) erroresPrevios.nombres = ['Los nombres son obligatorios (solo letras).']
    if (!estudianteEditando.user.apellidos.trim()) erroresPrevios.apellidos = ['Los apellidos son obligatorios (solo letras).']
    if (estudianteEditando.user.numero_documento.length < 5) erroresPrevios.numero_documento = ['El documento debe tener entre 5 y 10 dígitos numéricos.']
    if (!estudianteEditando.codigo_estudiantil.trim()) erroresPrevios.codigo_estudiantil = ['El código estudiantil es obligatorio (máx. 10 caracteres).']

    if (Object.keys(erroresPrevios).length > 0) {
      setErroresForm(erroresPrevios)
      setGuardando(false)
      return
    }

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
        mostrarNotificacion(normalizarError(err.response?.data?.message) || 'Error al actualizar estudiante.', 'error')
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
        {/* Tarjetas de Estadísticas y Firma Institucional */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
              <p className="text-xs font-bold uppercase tracking-wider text-[#08940c]">Pases Habilitados</p>
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
              <p className="text-xs font-bold uppercase tracking-wider text-[#d93025]">Pases Inhabilitados</p>
              <h3 className="text-2xl font-extrabold text-[#d93025] mt-1">{pasesBloqueados}</h3>
            </div>
            <div className="w-12 h-12 rounded-xl bg-[#fdecea] text-[#d93025] flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
          </div>

          {/* Tarjeta 4: Firma Digital del Admin / Tutor FET (Ampliada y Simétrica) */}
          <div className="bg-white border border-[#dfe6e1] p-5 rounded-2xl flex flex-col justify-between shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-extrabold uppercase tracking-wider text-[#067a0a]">Firma Institucional FET</p>
              {(firmaAdmin || user?.firma_digital) && (
                <span className="text-[10px] font-bold text-[#067a0a] bg-[#e8f8ea] px-2 py-0.5 rounded-full border border-[#08940c]/20">
                  ✓ Guardada
                </span>
              )}
            </div>

            {firmaAdmin || user?.firma_digital ? (
              <div className="w-full flex flex-col items-center">
                <div className="w-full h-24 bg-[#f8faf9] rounded-xl border border-dashed border-[#08940c]/40 p-2 flex flex-col items-center justify-center relative shadow-inner">
                  <img
                    key={firmaAdmin || user?.firma_digital}
                    src={urlArchivo(firmaAdmin || user?.firma_digital)}
                    alt="Firma Institucional Admin"
                    className="max-h-16 max-w-full object-contain"
                  />
                  <div className="w-3/4 border-t border-slate-300 mt-1"></div>
                  <span className="text-[8px] text-[#5f6b64] uppercase font-semibold">
                    Línea para formatos FET
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full mt-3">
                  <button
                    type="button"
                    onClick={handleRotarFirma}
                    disabled={rotandoFirma}
                    className="flex-1 py-1.5 px-2 text-xs font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-xl border border-[#08940c]/30 shadow-sm cursor-pointer flex items-center justify-center gap-1 transition-all disabled:opacity-50"
                    title="Girar firma 90 grados"
                  >
                    <span>🔄</span>
                    <span>{rotandoFirma ? 'Girando...' : 'Rotar 90°'}</span>
                  </button>
                  <label className="flex-1 py-1.5 px-2 text-center rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-[#dfe6e1] shadow-sm transition-all cursor-pointer">
                    <span>{subiendoFirma ? 'Subiendo...' : 'Cambiar'}</span>
                    <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center space-y-2 py-2">
                <p className="text-xs font-bold text-[#d93025]">Sin firma registrada</p>
                <label className="w-full py-2 px-3 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold shadow-md shadow-[#08940c]/25 transition-all cursor-pointer text-center">
                  <span>{subiendoFirma ? 'Subiendo...' : 'Subir firma FET'}</span>
                  <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
                </label>
              </div>
            )}
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
                  placeholder="Número de documento (solo números, máx. 10)..."
                  maxLength={10}
                  value={docBusqueda}
                  onFocus={() => setFocoCampo('docBusqueda')}
                  onBlur={() => setFocoCampo('')}
                  onChange={(e) => setDocBusqueda(filtrarSoloNumeros(e.target.value, 10))}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-4 py-3 text-sm text-[#14201a] placeholder-[#5f6b64] focus:outline-none transition-all font-mono"
                />
                <ReglaInput mensaje={obtenerReglaCampo('documento', docBusqueda, null, focoCampo === 'docBusqueda')} />
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
                              onClick={() => {
                                if (!est.hoja_vida_pdf) {
                                  mostrarNotificacion(`El estudiante ${est.user?.nombres} ${est.user?.apellidos} aún no ha subido su hoja de vida institucional.`, 'error')
                                  return
                                }
                                setEstudianteHvModal(est)
                              }}
                              className={`px-2.5 py-1 text-xs font-bold rounded-xl transition-colors border cursor-pointer flex items-center gap-1 ${
                                est.hoja_vida_pdf
                                  ? 'text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] border-[#08940c]/30'
                                  : 'text-amber-800 bg-amber-50 hover:bg-amber-100 border-amber-300'
                              }`}
                              title={est.hoja_vida_pdf ? 'Ver Hoja de Vida (Solo Lectura)' : 'El estudiante no ha subido su hoja de vida'}
                            >
                              <span>{est.hoja_vida_pdf ? '📄' : '⚠️'}</span>
                              <span>{est.hoja_vida_pdf ? 'Hoja de Vida' : 'Sin H.V.'}</span>
                            </button>

                            {/* Botón Seguimiento de Horas y Firmas */}
                            <button
                              onClick={() => handleAbrirSeguimiento(est)}
                              className="px-2.5 py-1 text-xs font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-xl transition-colors border border-[#08940c]/30 cursor-pointer flex items-center gap-1"
                              title="Seguimiento de Firmas y Horas de Pasantía"
                            >
                              <span>📑</span>
                              <span>Seguimiento</span>
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
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Nombres (solo letras)</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={nuevoEstudiante.nombres}
                    onFocus={() => setFocoCampo('reg_nombres')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, nombres: filtrarSoloLetras(e.target.value, 50) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Ej. Carlos Andres"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('nombre', nuevoEstudiante.nombres, erroresForm.nombres, focoCampo === 'reg_nombres')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Apellidos (solo letras)</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={nuevoEstudiante.apellidos}
                    onFocus={() => setFocoCampo('reg_apellidos')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, apellidos: filtrarSoloLetras(e.target.value, 50) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Ej. Pérez Gómez"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('apellido', nuevoEstudiante.apellidos, erroresForm.apellidos, focoCampo === 'reg_apellidos')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Número Documento (solo números, máx 10)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={nuevoEstudiante.numero_documento}
                    onFocus={() => setFocoCampo('reg_doc')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, numero_documento: filtrarSoloNumeros(e.target.value, 10) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                    placeholder="Ej. 1076904428"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('documento', nuevoEstudiante.numero_documento, erroresForm.numero_documento, focoCampo === 'reg_doc')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Código Estudiantil (máx 10)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={nuevoEstudiante.codigo_estudiantil}
                    onFocus={() => setFocoCampo('reg_codigo')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, codigo_estudiantil: filtrarCodigoEstudiantil(e.target.value, 10) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                    placeholder="Ej. 20261001"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('codigo', nuevoEstudiante.codigo_estudiantil, erroresForm.codigo_estudiantil, focoCampo === 'reg_codigo')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Correo Institucional</label>
                  <input
                    type="email"
                    required
                    maxLength={100}
                    value={nuevoEstudiante.email}
                    onFocus={() => setFocoCampo('reg_email')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, email: e.target.value.trim() })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="estudiante@passfet.edu.co"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('email', nuevoEstudiante.email, erroresForm.email, focoCampo === 'reg_email')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Contraseña Inicial (8 - 20 caracteres)</label>
                  <input
                    type="password"
                    required
                    maxLength={20}
                    value={nuevoEstudiante.password}
                    onFocus={() => setFocoCampo('reg_pass')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, password: filtrarPassword(e.target.value, 20) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                    placeholder="Mínimo 8, máximo 20 caracteres"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('password', nuevoEstudiante.password, erroresForm.password, focoCampo === 'reg_pass')} />
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
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Semestre (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={nuevoEstudiante.semestre}
                    onFocus={() => setFocoCampo('reg_semestre')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setNuevoEstudiante({ ...nuevoEstudiante, semestre: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('semestre', nuevoEstudiante.semestre, erroresForm.semestre, focoCampo === 'reg_semestre')} />
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
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Nombres (solo letras)</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={estudianteEditando.user.nombres}
                    onFocus={() => setFocoCampo('edit_nombres')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, nombres: filtrarSoloLetras(e.target.value, 50) },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('nombre', estudianteEditando.user.nombres, erroresForm.nombres, focoCampo === 'edit_nombres')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Apellidos (solo letras)</label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={estudianteEditando.user.apellidos}
                    onFocus={() => setFocoCampo('edit_apellidos')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, apellidos: filtrarSoloLetras(e.target.value, 50) },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('apellido', estudianteEditando.user.apellidos, erroresForm.apellidos, focoCampo === 'edit_apellidos')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Número Documento (solo números, máx 10)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={estudianteEditando.user.numero_documento}
                    onFocus={() => setFocoCampo('edit_doc')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, numero_documento: filtrarSoloNumeros(e.target.value, 10) },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('documento', estudianteEditando.user.numero_documento, erroresForm.numero_documento, focoCampo === 'edit_doc')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Código Estudiantil (máx 10)</label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={estudianteEditando.codigo_estudiantil}
                    onFocus={() => setFocoCampo('edit_codigo')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({ ...estudianteEditando, codigo_estudiantil: filtrarCodigoEstudiantil(e.target.value, 10) })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 font-mono"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('codigo', estudianteEditando.codigo_estudiantil, erroresForm.codigo_estudiantil, focoCampo === 'edit_codigo')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    required
                    maxLength={100}
                    value={estudianteEditando.user.email}
                    onFocus={() => setFocoCampo('edit_email')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({
                        ...estudianteEditando,
                        user: { ...estudianteEditando.user, email: e.target.value.trim() },
                      })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('email', estudianteEditando.user.email, erroresForm.email, focoCampo === 'edit_email')} />
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
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Semestre (1 - 10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={estudianteEditando.semestre || 1}
                    onFocus={() => setFocoCampo('edit_semestre')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) =>
                      setEstudianteEditando({ ...estudianteEditando, semestre: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })
                    }
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2.5 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('semestre', estudianteEditando.semestre, erroresForm.semestre, focoCampo === 'edit_semestre')} />
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

      {/* MODAL: Seguimiento de Horas y Firmas del Estudiante (Admin) */}
      {estudianteSeguimiento && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-4xl w-full shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-[#14201a]">
                  Seguimiento de Horas y Firmas de Pasantía
                </h3>
                <p className="text-xs text-[#5f6b64]">
                  Estudiante: <span className="font-bold text-[#14201a] capitalize">{estudianteSeguimiento.user?.nombres} {estudianteSeguimiento.user?.apellidos}</span> · Doc: {estudianteSeguimiento.user?.numero_documento} · Cód: {estudianteSeguimiento.codigo_estudiantil}
                </p>
              </div>
              <button
                onClick={() => setEstudianteSeguimiento(null)}
                className="text-[#5f6b64] hover:text-slate-900 p-1 font-bold cursor-pointer text-lg"
              >
                ✕
              </button>
            </div>

            {cargandoSeguimiento ? (
              <div className="py-12 text-center text-[#5f6b64]">
                <span className="animate-spin text-2xl inline-block mb-2 text-[#08940c]">⟳</span>
                <p>Cargando convenios y formatos de asistencia...</p>
              </div>
            ) : pasantiasSeguimiento.length === 0 ? (
              <div className="p-8 text-center bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] text-[#5f6b64]">
                <p className="text-sm font-bold text-[#14201a]">Sin pasantías vinculadas</p>
                <p className="text-xs mt-1">Este estudiante aún no ha sido vinculado a una empresa para pasantías.</p>
              </div>
            ) : (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
                {pasantiasSeguimiento.map((pas) => {
                  const formatos = pas.formatos_asistencia || []
                  const totalHoras = formatos.filter(f => f.check_habilitado).reduce((acc, f) => acc + (f.horas_cumplidas || 0), 0)

                  return (
                    <div key={pas.id} className="border border-[#dfe6e1] rounded-2xl p-4 bg-[#f8faf9] space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe6e1] pb-3 bg-white p-3.5 rounded-xl">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-[#067a0a] bg-[#e8f8ea] px-2 py-0.5 rounded-md">
                            Convenio de Pasantía Activo
                          </span>
                          <h4 className="text-base font-extrabold text-[#14201a] mt-1">
                            {pas.empresario?.empresa || pas.empresario?.razon_social || 'Empresa en Convenio'}
                          </h4>
                          <p className="text-xs text-[#5f6b64]">
                            Tutor Empresarial: {pas.empresario?.user?.nombres} {pas.empresario?.user?.apellidos} · Cargo: {pas.cargo_pasantia || 'Pasante'} · Periodo: {pas.fecha_inicio} a {pas.fecha_fin || 'Actual'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => descargarPdf(`/pasantias/${pas.id}/asistencia-pdf`, `formato_asistencia_${estudianteSeguimiento.user?.numero_documento}.pdf`)}
                            className="px-3 py-2 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm shadow-[#08940c]/20"
                          >
                            <span>📑</span>
                            <span>Descargar Formato Oficial (PDF)</span>
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold text-[#14201a]">
                          Registros de Asistencia ({formatos.length}):
                        </span>
                        <span className="text-xs font-bold text-[#067a0a] bg-[#e8f8ea] px-2.5 py-1 rounded-lg border border-[#08940c]/20">
                          Horas Aprobadas: {totalHoras} hrs
                        </span>
                      </div>

                      {formatos.length === 0 ? (
                        <p className="text-xs text-[#5f6b64] text-center py-4 bg-white rounded-xl border border-[#dfe6e1]">
                          El estudiante no ha reportado sesiones de asistencia en esta pasantía todavía.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-[#dfe6e1] bg-white">
                          <table className="w-full text-left text-xs text-[#14201a]">
                            <thead className="bg-[#f8faf9] text-[#5f6b64] uppercase text-[10px] tracking-wider border-b border-[#dfe6e1]">
                              <tr>
                                <th className="py-2.5 px-3 font-bold">Semana / Fecha</th>
                                <th className="py-2.5 px-3 font-bold">Horas</th>
                                <th className="py-2.5 px-3 font-bold">Actividades</th>
                                <th className="py-2.5 px-3 font-bold text-center">Firma Empresa</th>
                                <th className="py-2.5 px-3 font-bold text-center">Firma FET (Docente)</th>
                                <th className="py-2.5 px-3 font-bold text-right">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dfe6e1]">
                              {formatos.map((asist) => (
                                <tr key={asist.id} className="hover:bg-[#f8faf9] transition-colors">
                                  <td className="py-2.5 px-3 whitespace-nowrap">
                                    <span className="font-bold block">{asist.semana || 'Sesión'}</span>
                                    <span className="text-[10px] text-[#5f6b64]">{asist.fecha_registro}</span>
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-[#067a0a]">{asist.horas_cumplidas} hrs</td>
                                  <td className="py-2.5 px-3 max-w-xs">
                                    <p className="line-clamp-2 text-[#5f6b64]">{asist.actividades_realizadas}</p>
                                    {asist.evidencia_url && (
                                      <a
                                        href={urlArchivo(asist.evidencia_url)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-[10px] text-[#08940c] font-bold hover:underline mt-0.5"
                                      >
                                        <span>📎</span> Ver soporte
                                      </a>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    {asist.firma_empresario_url ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/20">
                                        ✓ Firmado
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                        ⏳ Pendiente
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                    {asist.firma_docente_url || asist.check_docente ? (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/20">
                                        ✓ Firmado FET
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
                                        ⏳ Sin firma FET
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                    <button
                                      onClick={() => {
                                        setAsistenciaSeleccionada(asist)
                                        setCheckHabilitado(asist.check_docente || asist.check_habilitado || false)
                                        setObservaciones(asist.observaciones || '')
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-[#08940c] hover:bg-[#067a0a] text-white text-[11px] font-bold cursor-pointer transition-all shadow-sm"
                                    >
                                      Revisar y Firmar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: Revisar y Firmar Asistencia por Administrador / Docente FET */}
      {asistenciaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#14201a]">Revisión Institucional de Asistencia (FET)</h3>
                <p className="text-xs text-[#5f6b64]">Estudiante: {estudianteSeguimiento?.user?.nombres} {estudianteSeguimiento?.user?.apellidos}</p>
              </div>
              <button
                onClick={() => setAsistenciaSeleccionada(null)}
                className="text-[#5f6b64] hover:text-slate-900 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 bg-[#f8faf9] p-4 rounded-2xl border border-[#dfe6e1] text-xs">
              <div className="grid grid-cols-2 gap-2">
                <p><span className="font-bold text-[#14201a]">Semana/Fecha:</span> {asistenciaSeleccionada.semana || 'Sesión'} · {asistenciaSeleccionada.fecha_registro}</p>
                <p><span className="font-bold text-[#14201a]">Horas reportadas:</span> {asistenciaSeleccionada.horas_cumplidas} hrs</p>
              </div>
              <div>
                <span className="font-bold text-[#14201a] block mb-1">Actividades Desarrolladas:</span>
                <p className="p-2.5 bg-white border border-[#dfe6e1] rounded-xl text-slate-700 whitespace-pre-line leading-relaxed">
                  {asistenciaSeleccionada.actividades_realizadas}
                </p>
              </div>
              {asistenciaSeleccionada.evidencia_url && (
                <div className="pt-2 border-t border-[#dfe6e1]">
                  <span className="font-bold text-[#14201a] block mb-1">Evidencia / Soporte:</span>
                  <a
                    href={urlArchivo(asistenciaSeleccionada.evidencia_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-[#dfe6e1] text-xs font-bold text-[#08940c] hover:underline"
                  >
                    <span>📎</span> Ver archivo de soporte ↗
                  </a>
                </div>
              )}
            </div>

            {/* Check de Habilitación y Aprobación Institucional FET */}
            <div className="p-4 bg-[#e8f8ea] border border-[#08940c]/30 rounded-2xl space-y-2">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkHabilitado}
                  onChange={(e) => setCheckHabilitado(e.target.checked)}
                  className="mt-0.5 w-5 h-5 accent-[#08940c] rounded cursor-pointer"
                />
                <div>
                  <span className="text-sm font-extrabold text-[#067a0a] block">
                    Check de Habilitación y Validación Institucional FET
                  </span>
                  <p className="text-xs text-[#067a0a]/80 mt-0.5">
                    Certifico como docente/administrador institucional que el pasante cumplió a cabalidad con las actividades reportadas en el periodo.
                  </p>
                </div>
              </label>

              {/* Previsualización de Firma que se estampará */}
              <div className="pt-2 border-t border-[#08940c]/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#067a0a] block">Firma FET a estampar:</span>
                  <span className="text-[10px] text-[#5f6b64]">Aparecerá en el formato de asistencia</span>
                </div>
                {firmaAdmin || user?.firma_digital ? (
                  <div className="flex items-center gap-2">
                    <img
                      key={firmaAdmin || user?.firma_digital}
                      src={urlArchivo(firmaAdmin || user?.firma_digital)}
                      alt="Firma Institucional"
                      className="h-12 max-w-[160px] object-contain bg-white rounded-lg p-1.5 border border-[#08940c]/30 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={handleRotarFirma}
                      disabled={rotandoFirma}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#067a0a] bg-white hover:bg-[#e8f8ea] rounded-lg border border-[#08940c]/30 cursor-pointer shadow-sm transition-all"
                      title="Girar firma 90° si está invertida o vertical"
                    >
                      {rotandoFirma ? 'Girando...' : '🔄 Rotar'}
                    </button>
                  </div>
                ) : (
                  <span className="text-xs text-[#d93025] font-bold">Debes subir tu foto de firma primero</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Observaciones o retroalimentación (Opcional)</label>
              <textarea
                rows="2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Comentarios institucionales sobre el cumplimiento de las horas..."
                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl p-3 text-xs text-[#14201a]"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#dfe6e1]">
              <button
                type="button"
                onClick={() => setAsistenciaSeleccionada(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={procesandoAsistencia}
                  onClick={() => handleGuardarAprobacionAdmin('rechazado')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer transition-all"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  disabled={procesandoAsistencia || (!firmaAdmin && !user?.firma_digital)}
                  onClick={() => handleGuardarAprobacionAdmin('aprobado')}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 cursor-pointer disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>{procesandoAsistencia ? 'Firmando...' : 'Aprobar y Firmar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}