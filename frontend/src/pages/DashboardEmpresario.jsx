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
  obtenerReglaCampo,
  normalizarError,
  formatearFecha,
} from '../utils/validationHelper'

export default function DashboardEmpresario() {
  const { user, logout } = useAuth()
  const [empresario, setEmpresario] = useState(null)
  const [pasantias, setPasantias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [notificacion, setNotificacion] = useState(null)
  const [focoCampo, setFocoCampo] = useState('')
  const [erroresVincular, setErroresVincular] = useState({})

  // Modal para ver Hoja de Vida de Pasante en solo lectura
  const [estudianteHvModal, setEstudianteHvModal] = useState(null)

  // Modal / Formulario para vincular pasante por documento
  const [modalVincular, setModalVincular] = useState(false)
  const [formVincular, setFormVincular] = useState({
    numero_documento: '',
    cargo_pasantia: 'Desarrollador Pasante',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: '',
  })
  const [vinculando, setVinculando] = useState(false)

  // Modal para revisar, aplicar Check de Habilitado y firmar asistencia (RF07)
  const [asistenciaSeleccionada, setAsistenciaSeleccionada] = useState(null)
  const [checkHabilitado, setCheckHabilitado] = useState(false)
  const [observaciones, setObservaciones] = useState('')
  const [procesandoAsistencia, setProcesandoAsistencia] = useState(false)

  // Subir / Cambiar foto de firma del empresario
  const [subiendoFirma, setSubiendoFirma] = useState(false)
  const [rotandoFirma, setRotandoFirma] = useState(false)
  const [firmaEmpresario, setFirmaEmpresario] = useState(user?.firma_digital || null)

  const avisar = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  const cargarDatos = async () => {
    try {
      const res = await api.get('/pasantias/empresario')
      setEmpresario(res.data.empresario)
      setPasantias(res.data.pasantias || [])
      const f = res.data.empresario?.user?.firma_digital || res.data.empresario?.firma_imagen
      if (f) {
        setFirmaEmpresario(f)
      }
    } catch (err) {
      avisar('Error al cargar datos del panel empresarial.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Subir foto de firma del empresario con compresión
  const handleSubirFirma = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFirma(true)
    try {
      const fileComprimido = await comprimirImagen(file, 1200, 0.9)
      const data = new FormData()
      data.append('firma', fileComprimido)
      const res = await api.post('/perfil/firma', data)
      avisar('Foto de firma actualizada correctamente.')
      if (res.data?.firma_digital) {
        setFirmaEmpresario(res.data.firma_digital + '?t=' + Date.now())
      }
      cargarDatos()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al subir la firma.', 'error')
    } finally {
      setSubiendoFirma(false)
    }
  }

  // Rotar firma del empresario (90°)
  const handleRotarFirma = async () => {
    setRotandoFirma(true)
    try {
      const res = await api.post('/perfil/firma/rotar', { grados: 90 })
      avisar('Foto de firma rotada correctamente.')
      if (res.data?.firma_digital) {
        setFirmaEmpresario(res.data.firma_digital + '?t=' + Date.now())
      }
      cargarDatos()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al rotar la firma.', 'error')
    } finally {
      setRotandoFirma(false)
    }
  }

  // Vincular estudiante a la empresa
  const handleVincularEstudiante = async (e) => {
    e.preventDefault()
    setErroresVincular({})

    const errs = {}
    if (formVincular.numero_documento.length < 5) {
      errs.numero_documento = ['El documento debe contener entre 5 y 10 dígitos numéricos.']
    }
    if (!formVincular.cargo_pasantia.trim()) {
      errs.cargo_pasantia = ['El cargo es obligatorio (solo letras).']
    }

    if (Object.keys(errs).length > 0) {
      setErroresVincular(errs)
      return
    }

    setVinculando(true)
    try {
      await api.post('/pasantias/vincular', formVincular)
      avisar('Estudiante vinculado a la empresa exitosamente.')
      setModalVincular(false)
      setFormVincular({
        numero_documento: '',
        cargo_pasantia: 'Desarrollador Pasante',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: '',
      })
      cargarDatos()
    } catch (err) {
      const msg = normalizarError(err.response?.data?.message) || 'No se pudo vincular al estudiante.'
      const serverErrors = err.response?.data?.errors || {}
      setErroresVincular({ ...serverErrors, general: msg })
      avisar(msg, 'error')
    } finally {
      setVinculando(false)
    }
  }

  // Procesar asistencia (Check de Habilitado + Firma) (RF07)
  const handleGuardarAprobacion = async (estadoAprobacion) => {
    if (estadoAprobacion === 'aprobado' && !checkHabilitado) {
      avisar('Debes marcar el "Check de Habilitación" para aprobar el formato.', 'error')
      return
    }
    const firmaActual = user?.firma_digital || empresario?.firma_imagen
    if (estadoAprobacion === 'aprobado' && !firmaActual) {
      avisar('Debes registrar tu foto de firma antes de aprobar formatos de asistencia.', 'error')
      return
    }

    setProcesandoAsistencia(true)
    try {
      await api.patch(`/pasantias/asistencias/${asistenciaSeleccionada.id}/aprobar`, {
        check_habilitado: estadoAprobacion === 'aprobado' ? true : false,
        estado: estadoAprobacion,
        observaciones: observaciones,
      })
      avisar(`Formato ${estadoAprobacion === 'aprobado' ? 'aprobado y firmado' : 'rechazado'} con éxito.`)
      setAsistenciaSeleccionada(null)
      cargarDatos()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al procesar formato de asistencia.', 'error')
    } finally {
      setProcesandoAsistencia(false)
    }
  }

  // Extraer todos los formatos de asistencia de todos los pasantes
  const formatosTotales = pasantias.flatMap((p) =>
    (p.formatos_asistencia || []).map((fa) => ({
      ...fa,
      estudianteNombre: `${p.estudiante?.user?.nombres} ${p.estudiante?.user?.apellidos}`,
      estudianteDoc: p.estudiante?.user?.numero_documento,
      cargoPasantia: p.cargo_pasantia,
      pasantiaId: p.id,
    }))
  )

  const firmaEmpresarioUrl = firmaEmpresario || empresario?.firma_imagen || user?.firma_digital

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800 flex flex-col font-sans selection:bg-[#08940c] selection:text-white">
      {/* Toast Notificación */}
      {notificacion && (
        <div className="fixed bottom-5 right-5 z-[9999] animate-bounce">
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

      {/* Barra Superior */}
      <header className="border-b border-[#dfe6e1] bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#08940c] to-[#067a0a] flex items-center justify-center font-bold text-white shadow-md shadow-[#08940c]/25">
              FET
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#14201a] leading-tight">PassFet Empresarial</h1>
              <p className="text-xs text-[#5f6b64] font-medium">Validación y Supervisión de Pasantías</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-sm bg-[#f8faf9] px-3.5 py-1.5 rounded-xl border border-[#dfe6e1]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#08940c] animate-pulse"></span>
              <span className="text-[#5f6b64]">Empresa:</span>
              <span className="font-bold text-[#14201a]">{empresario?.empresa || 'Empresa Vinculada'}</span>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-red-50 border border-[#dfe6e1] hover:border-red-200 transition-all shadow-sm cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 space-y-7">
        {/* Banner de Empresa & Firma Digital Ampliada */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-[#067a0a] bg-[#e8f8ea] px-2.5 py-1 rounded-md border border-[#08940c]/20">
              Supervisor Empresarial
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#14201a] tracking-tight">{empresario?.empresa}</h2>
            <p className="text-sm text-[#5f6b64] leading-relaxed">
              Supervisor: <span className="font-bold text-[#14201a]">{user?.nombres} {user?.apellidos}</span> · Cargo: <span className="text-[#14201a] font-medium">{empresario?.cargo || 'Tutor de Pasantía'}</span> · NIT: <span className="font-mono text-[#14201a]">{empresario?.nit || 'N/A'}</span>
            </p>
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-[#5f6b64]">
                <span className="w-2 h-2 rounded-full bg-[#08940c]"></span>
                Firma institucional para estampar en los formatos de asistencia de tus pasantes.
              </span>
            </div>
          </div>

          {/* Apartado Ampliado de Firma Digital del Empresario */}
          <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-2xl p-5 shrink-0 flex flex-col items-center sm:min-w-[290px]">
            <div className="w-full flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-[#14201a] uppercase tracking-wider">
                Firma del Supervisor
              </span>
              {firmaEmpresarioUrl && (
                <span className="text-[10px] font-bold text-[#067a0a] bg-[#e8f8ea] px-2 py-0.5 rounded-full border border-[#08940c]/20">
                  ✓ Registrada
                </span>
              )}
            </div>

            {firmaEmpresarioUrl ? (
              <div className="w-full flex flex-col items-center space-y-3">
                {/* Contenedor espacioso para visualizar cómo queda en el documento */}
                <div className="w-full h-28 bg-white rounded-xl border border-dashed border-[#08940c]/40 p-2.5 flex flex-col items-center justify-center relative shadow-inner">
                  <img
                    key={firmaEmpresarioUrl}
                    src={urlArchivo(firmaEmpresarioUrl)}
                    alt="Firma Supervisor Empresarial"
                    className="max-h-20 max-w-full object-contain"
                  />
                  <div className="w-3/4 border-t border-slate-300 mt-1"></div>
                  <span className="text-[8px] text-[#5f6b64] uppercase tracking-wider font-semibold">
                    Línea de firma para asistencias FET
                  </span>
                </div>

                {/* Botones de acción: Rotar y Cambiar */}
                <div className="flex items-center justify-between w-full gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRotarFirma}
                    disabled={rotandoFirma}
                    className="flex-1 py-1.5 px-3 text-xs font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-xl border border-[#08940c]/30 shadow-sm cursor-pointer flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                    title="Girar firma 90 grados para orientarla a tu gusto"
                  >
                    <span>🔄</span>
                    <span>{rotandoFirma ? 'Girando...' : 'Rotar 90°'}</span>
                  </button>

                  <label className="flex-1 py-1.5 px-3 text-center text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 rounded-xl border border-[#dfe6e1] shadow-sm cursor-pointer transition-all">
                    <span>{subiendoFirma ? 'Subiendo...' : 'Cambiar'}</span>
                    <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
                  </label>
                </div>
              </div>
            ) : (
              <div className="w-full flex flex-col items-center text-center py-2 space-y-3">
                <div className="w-full h-24 bg-white rounded-xl border border-dashed border-red-300 p-3 flex flex-col items-center justify-center text-[#d93025]">
                  <span className="text-xl">✍️</span>
                  <p className="text-xs font-bold mt-1">Sin firma registrada</p>
                  <p className="text-[10px] text-[#5f6b64]">Requerida para aprobar asistencias</p>
                </div>

                <label className="w-full py-2 px-4 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold shadow-md shadow-[#08940c]/25 cursor-pointer text-center transition-all">
                  <span>{subiendoFirma ? 'Subiendo...' : 'Subir foto de firma'}</span>
                  <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
                </label>
              </div>
            )}
          </div>
        </section>

        {/* Sección: Mis Pasantes Asignados */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe6e1] pb-3">
            <div>
              <h3 className="text-lg font-extrabold text-[#14201a]">Pasantes en Convenio</h3>
              <p className="text-xs text-[#5f6b64]">Estudiantes FET actualmente cursando pasantías en tu empresa.</p>
            </div>
            <button
              onClick={() => { setModalVincular(true); setErroresVincular({}); }}
              className="px-4 py-2 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#08940c]/25 flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <span>+</span>
              <span>Vincular Estudiante Pasante</span>
            </button>
          </div>

          {cargando ? (
            <div className="py-12 text-center text-[#5f6b64]">
              <span className="animate-spin text-2xl inline-block mb-2 text-[#08940c]">⟳</span>
              <p>Cargando pasantes...</p>
            </div>
          ) : pasantias.length === 0 ? (
            <div className="p-8 text-center bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] text-[#5f6b64]">
              <p className="text-sm font-bold text-[#14201a]">No tienes pasantes vinculados actualmente</p>
              <p className="text-xs mt-1">Usa el botón "Vincular Estudiante Pasante" ingresando su documento de identidad.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pasantias.map((pas) => {
                const est = pas.estudiante
                const habilitado = esPaseHabilitado(est?.pase?.estado)
                return (
                  <div key={pas.id} className="border border-[#dfe6e1] rounded-2xl p-4 bg-[#f8faf9] space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-[#5f6b64]">
                          Cód: {est?.codigo_estudiantil}
                        </span>
                        <h4 className="text-base font-extrabold text-[#14201a] capitalize leading-snug">
                          {est?.user?.nombres} {est?.user?.apellidos}
                        </h4>
                        <p className="text-xs text-[#5f6b64]">{est?.programa?.nombre}</p>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          habilitado ? 'bg-[#e8f8ea] text-[#067a0a]' : 'bg-[#fdecea] text-[#d93025]'
                        }`}
                      >
                        {habilitado ? 'Habilitado' : 'Inhabilitado'}
                      </span>
                    </div>

                    <div className="text-xs text-[#5f6b64] space-y-0.5 bg-white p-2.5 rounded-xl border border-[#dfe6e1]">
                      <p><span className="font-bold text-[#14201a]">Doc:</span> {est?.user?.numero_documento}</p>
                      <p><span className="font-bold text-[#14201a]">Cargo:</span> {pas.cargo_pasantia || 'Pasante'}</p>
                      <p><span className="font-bold text-[#14201a]">Periodo:</span> {pas.fecha_inicio} a {pas.fecha_fin || 'Actual'}</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          if (!est?.hoja_vida_pdf) {
                            avisar(`El estudiante ${est?.user?.nombres || 'pasante'} aún no ha subido su hoja de vida institucional.`, 'advertencia')
                            return
                          }
                          setEstudianteHvModal(est)
                        }}
                        className={`w-full text-center py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          est?.hoja_vida_pdf
                            ? 'bg-white hover:bg-[#e8f8ea] text-[#067a0a] border-[#08940c]/30'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                        title={est?.hoja_vida_pdf ? 'Ver Hoja de Vida (Solo Lectura)' : 'El pasante no ha subido su hoja de vida'}
                      >
                        <span>{est?.hoja_vida_pdf ? '📄' : '⚠️'}</span>
                        <span>{est?.hoja_vida_pdf ? 'Ver Hoja de Vida (Solo Lectura)' : 'H.V. Pendiente por subir'}</span>
                      </button>

                      <button
                        onClick={() => descargarPdf(`/pasantias/${pas.id}/asistencia-pdf`, `formato_asistencia_${est?.user?.numero_documento}.pdf`)}
                        className="w-full text-center py-2 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-[#08940c]/20"
                      >
                        <span>📑</span>
                        <span>Descargar Formato Asistencia (PDF)</span>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Sección: Validación y Formatos de Asistencia (RF07) */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <div className="border-b border-[#dfe6e1] pb-3">
            <h3 className="text-lg font-extrabold text-[#14201a]">Control de Asistencias y Firma de Formatos (RF07)</h3>
            <p className="text-xs text-[#5f6b64]">
              Revisa las actividades registradas por tus pasantes, marca el "Check de Habilitación" y estampa tu firma digital aprobatoria.
            </p>
          </div>

          {formatosTotales.length === 0 ? (
            <div className="p-8 text-center bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] text-[#5f6b64]">
              <p className="text-sm font-bold text-[#14201a]">No hay formatos de asistencia registrados</p>
              <p className="text-xs mt-1">Los formatos registrados por tus pasantes aparecerán aquí para tu firma y aprobación.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-[#dfe6e1]">
              <table className="w-full text-left text-sm text-[#14201a]">
                <thead className="bg-[#f8faf9] text-[#5f6b64] uppercase text-[11px] tracking-wider border-b border-[#dfe6e1]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Fecha</th>
                    <th className="py-3 px-4 font-bold">Pasante</th>
                    <th className="py-3 px-4 font-bold">Horas</th>
                    <th className="py-3 px-4 font-bold">Actividades Realizadas</th>
                    <th className="py-3 px-4 font-bold text-center">Estado / Check</th>
                    <th className="py-3 px-4 font-bold text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#dfe6e1]">
                  {formatosTotales.map((fa) => (
                    <tr key={fa.id} className="hover:bg-[#f8faf9] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-xs whitespace-nowrap">{formatearFecha(fa.fecha_registro)}</td>
                      <td className="py-3.5 px-4">
                        <p className="font-bold text-[#14201a]">{fa.estudianteNombre}</p>
                        <p className="text-[11px] text-[#5f6b64]">Doc: {fa.estudianteDoc}</p>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-xs">{fa.horas_cumplidas} hrs</td>
                      <td className="py-3.5 px-4 max-w-xs text-xs text-[#5f6b64] truncate">
                        {fa.actividades_realizadas}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                            fa.check_habilitado
                              ? 'bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/30'
                              : fa.estado === 'rechazado'
                              ? 'bg-[#fdecea] text-[#d93025] border border-red-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {fa.check_habilitado ? '✓ Aprobado y Firmado' : fa.estado === 'rechazado' ? '✕ Rechazado' : '⏳ Pendiente'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => {
                            setAsistenciaSeleccionada(fa)
                            setCheckHabilitado(fa.check_habilitado || false)
                            setObservaciones(fa.observaciones || '')
                          }}
                          className="px-3 py-1.5 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold shadow-sm cursor-pointer"
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
        </section>
      </main>

      {/* MODAL: Revisar Asistencia, Check de Habilitado y Firma (RF07) */}
      {asistenciaSeleccionada && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-[#14201a]">Revisión de Formato de Asistencia</h3>
                <p className="text-xs text-[#5f6b64]">Estudiante: {asistenciaSeleccionada.estudianteNombre}</p>
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
                <p><span className="font-bold text-[#14201a]">Fecha:</span> {formatearFecha(asistenciaSeleccionada.fecha_registro)}</p>
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

            {/* Check de Habilitación (RF07) */}
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
                    Check de Habilitación y Cumplimiento
                  </span>
                  <p className="text-xs text-[#067a0a]/80 mt-0.5">
                    Certifico como supervisor empresarial que el pasante cumplió las horas y actividades reportadas a satisfacción.
                  </p>
                </div>
              </label>

              {/* Previsualización de Firma que se estampará */}
              <div className="pt-2 border-t border-[#08940c]/20 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-[#067a0a] block">Firma a estampar:</span>
                  <span className="text-[10px] text-[#5f6b64]">Aparecerá en el formato de asistencia</span>
                </div>
                {firmaEmpresarioUrl ? (
                  <div className="flex items-center gap-2">
                    <img
                      key={firmaEmpresarioUrl}
                      src={urlArchivo(firmaEmpresarioUrl)}
                      alt="Firma Supervisor"
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
                  <span className="text-xs text-[#d93025] font-bold">Falta registrar foto de firma</span>
                )}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Observaciones / Retroalimentación</label>
              <textarea
                rows="2"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-2.5 text-xs text-[#14201a]"
                placeholder="Observaciones opcionales del tutor empresarial..."
              />
            </div>

            {/* Botones de Acción */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#dfe6e1]">
              <button
                type="button"
                disabled={procesandoAsistencia}
                onClick={() => handleGuardarAprobacion('rechazado')}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 cursor-pointer"
              >
                Rechazar
              </button>
              <button
                type="button"
                disabled={procesandoAsistencia || !checkHabilitado || !firmaEmpresarioUrl}
                onClick={() => handleGuardarAprobacion('aprobado')}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 disabled:opacity-50 cursor-pointer"
              >
                {procesandoAsistencia ? 'Procesando...' : 'Aprobar y Firmar ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Vincular Estudiante por Documento */}
      {modalVincular && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <h3 className="text-base font-extrabold text-[#14201a]">Vincular Pasante a la Empresa</h3>
              <button onClick={() => setModalVincular(false)} className="text-[#5f6b64] hover:text-slate-900 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleVincularEstudiante} className="space-y-4">
              {erroresVincular.general && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-600 text-xs font-semibold flex items-center gap-2.5">
                  <span className="font-bold text-sm">✕</span>
                  <p>{erroresVincular.general}</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Número de Documento del Estudiante (solo números, máx 10)</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formVincular.numero_documento}
                  onFocus={() => setFocoCampo('vinc_doc')}
                  onBlur={() => setFocoCampo('')}
                  onChange={(e) => setFormVincular({ ...formVincular, numero_documento: filtrarSoloNumeros(e.target.value, 10) })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2 text-sm text-[#14201a] font-mono"
                  placeholder="Ej. 1000000002"
                />
                <ReglaInput mensaje={obtenerReglaCampo('documento', formVincular.numero_documento, erroresVincular.numero_documento, focoCampo === 'vinc_doc')} />
                <p className="text-[11px] text-[#5f6b64] mt-1">El estudiante debe contar con su pase en estado "Habilitado".</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Cargo / Rol de Pasantía (solo letras)</label>
                <input
                  type="text"
                  required
                  maxLength={100}
                  value={formVincular.cargo_pasantia}
                  onFocus={() => setFocoCampo('vinc_cargo')}
                  onBlur={() => setFocoCampo('')}
                  onChange={(e) => setFormVincular({ ...formVincular, cargo_pasantia: filtrarSoloLetras(e.target.value, 100) })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2 text-sm text-[#14201a]"
                  placeholder="Ej. Desarrollador Pasante"
                />
                <ReglaInput mensaje={obtenerReglaCampo('cargo', formVincular.cargo_pasantia, erroresVincular.cargo_pasantia, focoCampo === 'vinc_cargo')} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    required
                    value={formVincular.fecha_inicio}
                    onChange={(e) => setFormVincular({ ...formVincular, fecha_inicio: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha Fin (Estimada)</label>
                  <input
                    type="date"
                    value={formVincular.fecha_fin}
                    onChange={(e) => setFormVincular({ ...formVincular, fecha_fin: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#dfe6e1]">
                <button
                  type="button"
                  onClick={() => setModalVincular(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={vinculando}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 disabled:opacity-50 cursor-pointer"
                >
                  {vinculando ? 'Vinculando...' : 'Vincular Pasante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Ver Hoja de Vida del Pasante en Solo Lectura */}
      {estudianteHvModal && (
        <HojaVidaVista
          estudiante={estudianteHvModal}
          onCerrar={() => setEstudianteHvModal(null)}
        />
      )}
    </div>
  )
}
