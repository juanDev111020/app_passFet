import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { descargarPdf, esPaseHabilitado, urlArchivo } from '../api/archivos'

const TIPOS_EXP = {
  semillero: 'Semillero de investigación',
  proyecto_aplicacion: 'Proyecto de aplicación',
  laboral: 'Experiencia laboral',
  otro: 'Otro',
}

export default function PerfilEstudiante() {
  const { user, logout } = useAuth()
  const [estudiante, setEstudiante] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [descargandoPdf, setDescargandoPdf] = useState(false)
  const [notificacion, setNotificacion] = useState(null)

  // Formulario Datos de Contacto y Perfil
  const [datosForm, setDatosForm] = useState({
    telefono: '',
    ciudad: '',
    direccion: '',
    linkedin: '',
    idiomas: '',
    resumen_profesional: '',
    habilidades: '',
    formacion_complementaria: '',
  })

  // Modal / Formulario Nueva Experiencia
  const [modalExp, setModalExp] = useState(false)
  const [editandoExpId, setEditandoExpId] = useState(null)
  const [formExp, setFormExp] = useState({
    titulo: '',
    tipo: 'semillero',
    entidad: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
  })

  // Archivo de Evidencia para Experiencia
  const [evidenciaExpId, setEvidenciaExpId] = useState(null)
  const [subiendoArchivo, setSubiendoArchivo] = useState(false)

  // Formulario de Formato de Asistencia a Pasantía (RF07)
  const [pasantias, setPasantias] = useState([])
  const [formAsistencia, setFormAsistencia] = useState({
    pasantia_id: '',
    semana: 'Semana 1',
    fecha_registro: new Date().toISOString().split('T')[0],
    horas_cumplidas: 8,
    actividades_realizadas: '',
    evidencia: null,
  })
  const [modalAsistencia, setModalAsistencia] = useState(false)

  const avisar = (mensaje, tipo = 'exito') => {
    setNotificacion({ mensaje, tipo })
    setTimeout(() => setNotificacion(null), 4000)
  }

  const cargarPerfil = async () => {
    try {
      const [resPerfil, resPasantias] = await Promise.all([
        api.get('/perfil'),
        api.get('/pasantias/estudiante'),
      ])
      const est = resPerfil.data.estudiante
      setEstudiante(est)
      if (est) {
        setDatosForm({
          telefono: est.telefono || '',
          ciudad: est.ciudad || '',
          direccion: est.direccion || '',
          linkedin: est.linkedin || '',
          idiomas: est.idiomas || '',
          resumen_profesional: est.resumen_profesional || '',
          habilidades: est.habilidades || '',
          formacion_complementaria: est.formacion_complementaria || '',
        })
      }
      setPasantias(resPasantias.data || [])
      if (resPasantias.data?.length > 0 && !formAsistencia.pasantia_id) {
        setFormAsistencia((prev) => ({ ...prev, pasantia_id: resPasantias.data[0].id }))
      }
    } catch (err) {
      avisar('Error al cargar datos del perfil.', 'error')
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarPerfil()
  }, [])

  // Guardar datos básicos y profesionales
  const handleGuardarDatos = async (e) => {
    e.preventDefault()
    setGuardando(true)
    try {
      const res = await api.put('/perfil', datosForm)
      setEstudiante(res.data.estudiante)
      avisar('Perfil profesional actualizado con éxito.')
    } catch (err) {
      avisar('Error al actualizar el perfil.', 'error')
    } finally {
      setGuardando(false)
    }
  }

  // Descargar PDF generado oficialmente desde Laravel
  const handleDescargarPdf = async () => {
    setDescargandoPdf(true)
    try {
      await descargarPdf('/hoja-vida/pdf', `Hoja_De_Vida_${user?.numero_documento}.pdf`)
      avisar('Hoja de vida descargada en PDF.')
    } catch (err) {
      avisar('No se pudo generar el PDF de la hoja de vida.', 'error')
    } finally {
      setDescargandoPdf(false)
    }
  }

  // Subir Hoja de Vida en PDF personalizado (RF06)
  const handleSubirHvPdf = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type !== 'application/pdf') {
      avisar('El archivo debe ser estrictamente en formato PDF.', 'error')
      return
    }
    const data = new FormData()
    data.append('hoja_vida', file)
    setSubiendoArchivo(true)
    try {
      const res = await api.post('/perfil/hoja-vida', data)
      setEstudiante((prev) => ({ ...prev, hoja_vida_pdf: res.data.hoja_vida_pdf }))
      avisar('Hoja de vida en PDF actualizada.')
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al subir la hoja de vida.', 'error')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  // Subir Firma Digital (foto/imagen)
  const handleSubirFirma = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = new FormData()
    data.append('firma', file)
    setSubiendoArchivo(true)
    try {
      const res = await api.post('/perfil/firma', data)
      avisar('Firma digital actualizada con éxito.')
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al subir la firma.', 'error')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  // Guardar o Editar Experiencia
  const handleGuardarExp = async (e) => {
    e.preventDefault()
    try {
      if (editandoExpId) {
        await api.put(`/experiencias/${editandoExpId}`, formExp)
        avisar('Experiencia actualizada.')
      } else {
        await api.post('/experiencias', formExp)
        avisar('Experiencia registrada correctamente.')
      }
      setModalExp(false)
      setEditandoExpId(null)
      setFormExp({
        titulo: '',
        tipo: 'semillero',
        entidad: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
      })
      cargarPerfil()
    } catch (err) {
      avisar('Error al guardar experiencia.', 'error')
    }
  }

  const handleEliminarExp = async (id) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta experiencia y sus evidencias?')) return
    try {
      await api.delete(`/experiencias/${id}`)
      avisar('Experiencia eliminada.')
      cargarPerfil()
    } catch (err) {
      avisar('Error al eliminar experiencia.', 'error')
    }
  }

  // Subir archivo de evidencia
  const handleSubirEvidencia = async (e, expId) => {
    const file = e.target.files?.[0]
    if (!file) return
    const data = new FormData()
    data.append('archivo', file)
    setSubiendoArchivo(true)
    try {
      await api.post(`/experiencias/${expId}/evidencias`, data)
      avisar('Evidencia subida correctamente.')
      cargarPerfil()
    } catch (err) {
      avisar('Error al subir la evidencia.', 'error')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  const handleEliminarEvidencia = async (evidenciaId) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return
    try {
      await api.delete(`/evidencias/${evidenciaId}`)
      avisar('Evidencia eliminada.')
      cargarPerfil()
    } catch (err) {
      avisar('Error al eliminar evidencia.', 'error')
    }
  }

  // Registrar asistencia a pasantía
  const handleRegistrarAsistencia = async (e) => {
    e.preventDefault()
    try {
      const data = new FormData()
      data.append('pasantia_id', formAsistencia.pasantia_id)
      if (formAsistencia.semana) data.append('semana', formAsistencia.semana)
      data.append('fecha_registro', formAsistencia.fecha_registro)
      data.append('horas_cumplidas', formAsistencia.horas_cumplidas)
      data.append('actividades_realizadas', formAsistencia.actividades_realizadas)
      if (formAsistencia.evidencia) {
        data.append('evidencia', formAsistencia.evidencia)
      }

      await api.post('/pasantias/asistencias', data)
      avisar('Formato de asistencia enviado al empresario.')
      setModalAsistencia(false)
      setFormAsistencia((prev) => ({
        ...prev,
        semana: 'Semana 1',
        actividades_realizadas: '',
        horas_cumplidas: 8,
        evidencia: null,
      }))
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al registrar asistencia.', 'error')
    }
  }

  const habilitado = esPaseHabilitado(estudiante?.pase?.estado)

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

      {/* Navegación Superior */}
      <header className="border-b border-[#dfe6e1] bg-white sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#08940c] to-[#067a0a] flex items-center justify-center font-bold text-white shadow-md shadow-[#08940c]/25">
              FET
            </div>
            <div>
              <h1 className="text-base font-extrabold text-[#14201a] leading-tight">PassFet</h1>
              <p className="text-xs text-[#5f6b64] font-medium">Perfil Profesional y Pasantías</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/estudiante/pase"
              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#5f6b64] hover:text-[#08940c] hover:bg-[#e8f8ea] transition-all"
            >
              Mi Pase FET
            </Link>
            <Link
              to="/estudiante/perfil"
              className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold text-[#067a0a] bg-[#e8f8ea] border border-[#08940c]/30"
            >
              Hoja de Vida
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-red-600 bg-white hover:bg-red-50 border border-[#dfe6e1] transition-all shadow-sm cursor-pointer"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 space-y-6">
        {/* Banner de Estado del Estudiante y Descarga de PDF */}
        <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f6b64]">Estudiante FET</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-extrabold ${
                  habilitado ? 'bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/30' : 'bg-[#fdecea] text-[#d93025] border border-red-300'
                }`}
              >
                {habilitado ? '● Habilitado para pasantía' : '● Inhabilitado'}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold text-[#14201a] capitalize">
              {user?.nombres} {user?.apellidos}
            </h2>
            <p className="text-sm text-[#5f6b64]">
              {estudiante?.programa?.nombre} · Semestre {estudiante?.semestre} · Doc: <span className="font-mono font-semibold">{user?.numero_documento}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleDescargarPdf}
              disabled={descargandoPdf}
              className="px-5 py-2.5 rounded-2xl bg-[#08940c] hover:bg-[#067a0a] disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-[#08940c]/25 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>📄</span>
              <span>{descargandoPdf ? 'Generando PDF...' : 'Descargar Hoja de Vida (PDF)'}</span>
            </button>
            <Link
              to="/estudiante/pase"
              className="px-4 py-2.5 rounded-2xl bg-white hover:bg-[#f8faf9] text-[#14201a] text-sm font-bold border border-[#dfe6e1] transition-all"
            >
              Ver Pase Digital
            </Link>
          </div>
        </section>

        {/* Sección: Datos Personales y Perfil */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleGuardarDatos} className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <div className="border-b border-[#dfe6e1] pb-3">
                <h3 className="text-lg font-extrabold text-[#14201a]">Información Personal y Profesional</h3>
                <p className="text-xs text-[#5f6b64]">Estos datos se incluirán automáticamente en la generación de tu Hoja de Vida.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={datosForm.telefono}
                    onChange={(e) => setDatosForm({ ...datosForm, telefono: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Ej. 310 123 4567"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Ciudad de Residencia</label>
                  <input
                    type="text"
                    value={datosForm.ciudad}
                    onChange={(e) => setDatosForm({ ...datosForm, ciudad: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Ej. Neiva, Huila"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Dirección</label>
                  <input
                    type="text"
                    value={datosForm.direccion}
                    onChange={(e) => setDatosForm({ ...datosForm, direccion: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Ej. Calle 10 # 5-20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">LinkedIn / Enlace Portafolio</label>
                  <input
                    type="text"
                    value={datosForm.linkedin}
                    onChange={(e) => setDatosForm({ ...datosForm, linkedin: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="https://linkedin.com/in/tu-perfil"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Resumen del Perfil Profesional</label>
                <textarea
                  rows="3"
                  value={datosForm.resumen_profesional}
                  onChange={(e) => setDatosForm({ ...datosForm, resumen_profesional: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl p-3 text-sm text-[#14201a]"
                  placeholder="Describe tu perfil, intereses académicos, fortalezas y metas de pasantía..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Habilidades (separadas por coma)</label>
                  <input
                    type="text"
                    value={datosForm.habilidades}
                    onChange={(e) => setDatosForm({ ...datosForm, habilidades: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="React, Laravel, PostgreSQL, Git, Trabajo en equipo"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Idiomas</label>
                  <input
                    type="text"
                    value={datosForm.idiomas}
                    onChange={(e) => setDatosForm({ ...datosForm, idiomas: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Español (Nativo), Inglés (B1)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Formación Complementaria (Cursos, Certificados)</label>
                <textarea
                  rows="2"
                  value={datosForm.formacion_complementaria}
                  onChange={(e) => setDatosForm({ ...datosForm, formacion_complementaria: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl p-3 text-sm text-[#14201a]"
                  placeholder="Diplomado en Desarrollo Web, Curso de Seguridad de la Información FET..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2.5 rounded-xl bg-[#08940c] hover:bg-[#067a0a] disabled:opacity-50 text-white text-sm font-bold shadow-md shadow-[#08940c]/25 transition-all cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar Datos del Perfil'}
                </button>
              </div>
            </form>

            {/* Sección: Experiencias Universitarias (RF05) */}
            <section className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#dfe6e1] pb-3">
                <div>
                  <h3 className="text-lg font-extrabold text-[#14201a]">Experiencia Universitaria y Semilleros</h3>
                  <p className="text-xs text-[#5f6b64]">Registra semilleros de investigación, proyectos de aula o experiencia laboral con evidencias.</p>
                </div>
                <button
                  onClick={() => {
                    setEditandoExpId(null)
                    setFormExp({
                      titulo: '',
                      tipo: 'semillero',
                      entidad: '',
                      descripcion: '',
                      fecha_inicio: '',
                      fecha_fin: '',
                    })
                    setModalExp(true)
                  }}
                  className="px-4 py-2 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#08940c]/25 flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <span>+</span>
                  <span>Añadir Experiencia</span>
                </button>
              </div>

              {estudiante?.experiencias?.length === 0 ? (
                <div className="p-8 text-center bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] text-[#5f6b64]">
                  <p className="text-sm font-bold text-[#14201a]">Aún no has registrado experiencias</p>
                  <p className="text-xs mt-1">Añade proyectos de aplicación o semilleros para enriquecer tu hoja de vida.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {estudiante?.experiencias?.map((exp) => (
                    <div key={exp.id} className="border border-[#dfe6e1] border-l-4 border-l-[#08940c] rounded-2xl p-4 sm:p-5 bg-white space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#067a0a] bg-[#e8f8ea] px-2 py-0.5 rounded-md">
                            {TIPOS_EXP[exp.tipo] || exp.tipo}
                          </span>
                          <h4 className="text-base font-extrabold text-[#14201a] mt-1">{exp.titulo}</h4>
                          <p className="text-xs text-[#5f6b64]">
                            {exp.entidad && <span>{exp.entidad} · </span>}
                            <span>{exp.fecha_inicio || 'Inicio'} — {exp.fecha_fin || 'Actualidad'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditandoExpId(exp.id)
                              setFormExp({
                                titulo: exp.titulo,
                                tipo: exp.tipo,
                                entidad: exp.entidad || '',
                                descripcion: exp.descripcion || '',
                                fecha_inicio: exp.fecha_inicio || '',
                                fecha_fin: exp.fecha_fin || '',
                              })
                              setModalExp(true)
                            }}
                            className="text-xs font-bold text-[#08940c] hover:underline cursor-pointer"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminarExp(exp.id)}
                            className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                      {exp.descripcion && <p className="text-sm text-[#14201a] leading-relaxed">{exp.descripcion}</p>}

                      {/* Evidencias vinculadas */}
                      <div className="pt-2 border-t border-[#dfe6e1]/70">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#5f6b64]">Archivos y Evidencias adjuntas ({exp.evidencias?.length || 0}):</span>
                          <label className="text-xs font-bold text-[#08940c] hover:underline cursor-pointer flex items-center gap-1">
                            <span>📎 Adjuntar evidencia</span>
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => handleSubirEvidencia(e, exp.id)}
                            />
                          </label>
                        </div>

                        {exp.evidencias?.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {exp.evidencias.map((ev) => (
                              <div
                                key={ev.id}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#f8faf9] border border-[#dfe6e1] text-xs"
                              >
                                <a
                                  href={urlArchivo(ev.archivo_url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-bold text-[#08940c] hover:underline max-w-[180px] truncate"
                                >
                                  {ev.nombre_original}
                                </a>
                                <button
                                  onClick={() => handleEliminarEvidencia(ev.id)}
                                  className="text-red-500 hover:text-red-700 font-bold cursor-pointer"
                                  title="Eliminar evidencia"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Columna Derecha: Firma Digital, Hoja de Vida PDF externa y Pasantías */}
          <div className="space-y-6">
            {/* Foto de Firma Digital */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2">
                <h3 className="text-base font-extrabold text-[#14201a]">Firma Digital (Foto)</h3>
                <p className="text-xs text-[#5f6b64]">Sube la foto de tu firma para estamparla en documentos institucionales y en tu hoja de vida.</p>
              </div>

              {user?.firma_digital ? (
                <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] flex flex-col items-center">
                  <img
                    src={urlArchivo(user.firma_digital)}
                    alt="Firma Digital"
                    className="max-h-24 object-contain"
                  />
                  <p className="text-[11px] font-bold text-[#067a0a] mt-2">✓ Firma guardada</p>
                </div>
              ) : (
                <div className="p-4 bg-[#fdecea] rounded-2xl border border-red-200 text-center text-xs text-[#d93025]">
                  Aún no has registrado tu foto de firma.
                </div>
              )}

              <label className="block w-full py-2.5 px-4 text-center rounded-xl bg-[#e8f8ea] hover:bg-[#d5f3d8] text-[#067a0a] text-xs font-bold border border-[#08940c]/30 cursor-pointer transition-all">
                <span>{user?.firma_digital ? 'Cambiar Foto de Firma' : 'Subir Foto de Firma'}</span>
                <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
              </label>
            </div>

            {/* Hoja de Vida en PDF personalizado (RF06) */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2">
                <h3 className="text-base font-extrabold text-[#14201a]">Hoja de Vida en PDF (Carga Externa)</h3>
                <p className="text-xs text-[#5f6b64]">Opcionalmente puedes subir un PDF propio de tu hoja de vida diseñado previamente.</p>
              </div>

              {estudiante?.hoja_vida_pdf ? (
                <div className="p-3 bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#14201a]">PDF cargado</p>
                    <a
                      href={urlArchivo(estudiante.hoja_vida_pdf)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#08940c] hover:underline"
                    >
                      Ver documento PDF ↗
                    </a>
                  </div>
                  <span className="text-xs text-[#067a0a] font-bold">✓ Listo</span>
                </div>
              ) : (
                <p className="text-xs text-[#5f6b64]">No has cargado un archivo PDF adicional.</p>
              )}

              <label className="block w-full py-2.5 px-4 text-center rounded-xl bg-white hover:bg-[#f8faf9] text-[#14201a] text-xs font-bold border border-[#dfe6e1] cursor-pointer transition-all">
                <span>Subir / Reemplazar PDF</span>
                <input type="file" accept="application/pdf" onChange={handleSubirHvPdf} className="hidden" />
              </label>
            </div>

            {/* Módulo de Pasantías y Formato de Asistencia (RF07) */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-extrabold text-[#14201a]">Mis Pasantías</h3>
                  <p className="text-xs text-[#5f6b64]">Seguimiento a asistencias y supervisión empresarial.</p>
                </div>
                {pasantias.length > 0 && (
                  <button
                    onClick={() => setModalAsistencia(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#08940c] hover:bg-[#067a0a] text-white text-xs font-bold cursor-pointer"
                  >
                    + Registrar Horas
                  </button>
                )}
              </div>

              {pasantias.length === 0 ? (
                <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] text-xs text-[#5f6b64] text-center">
                  No estás vinculado a ninguna pasantía activa actualmente.
                </div>
              ) : (
                <div className="space-y-4">
                  {pasantias.map((pas) => (
                    <div key={pas.id} className="border border-[#dfe6e1] rounded-2xl p-3.5 bg-[#f8faf9] space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-[#14201a]">{pas.empresario?.empresa}</p>
                          <p className="text-[11px] text-[#5f6b64]">
                            Supervisor: {pas.empresario?.user?.nombres} {pas.empresario?.user?.apellidos} · Cargo: {pas.cargo_pasantia || 'Pasante'}
                          </p>
                        </div>
                        <button
                          onClick={() => descargarPdf(`/pasantias/${pas.id}/asistencia-pdf`, `formato_asistencia_${user?.numero_documento}.pdf`)}
                          className="px-2.5 py-1 rounded-lg bg-white hover:bg-[#e8f8ea] text-[#067a0a] border border-[#08940c]/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-sm transition-all shrink-0"
                          title="Descargar formato institucional en PDF"
                        >
                          <span>📑</span> Formato PDF
                        </button>
                      </div>

                      <div className="mt-2 space-y-2">
                        <span className="text-[10px] font-bold uppercase text-[#5f6b64] block">Formatos de Asistencia:</span>
                        {pas.formatos_asistencia?.length === 0 ? (
                          <p className="text-[11px] text-[#5f6b64]">Sin asistencias registradas.</p>
                        ) : (
                          pas.formatos_asistencia?.map((asist) => (
                            <div key={asist.id} className="bg-white border border-[#dfe6e1] p-2 rounded-xl text-xs space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="font-bold">{asist.fecha_registro} ({asist.horas_cumplidas} hrs)</span>
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    asist.check_habilitado
                                      ? 'bg-[#e8f8ea] text-[#067a0a]'
                                      : 'bg-[#fdecea] text-[#d93025]'
                                  }`}
                                >
                                  {asist.check_habilitado ? '✓ Aprobado y Firmado' : '⏳ Pendiente'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5f6b64] line-clamp-2">{asist.actividades_realizadas}</p>
                              {asist.firma_empresario_url && (
                                <div className="pt-1 flex items-center gap-1.5 text-[10px] text-[#067a0a] font-bold">
                                  <span>Firma del empresario estampada</span>
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* MODAL: Nueva / Editar Experiencia */}
      {modalExp && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <h3 className="text-base font-extrabold text-[#14201a]">
                {editandoExpId ? 'Editar Experiencia' : 'Nueva Experiencia Universitaria'}
              </h3>
              <button onClick={() => setModalExp(false)} className="text-[#5f6b64] hover:text-slate-900 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleGuardarExp} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Título de la Experiencia / Proyecto</label>
                <input
                  type="text"
                  required
                  value={formExp.titulo}
                  onChange={(e) => setFormExp({ ...formExp, titulo: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2 text-sm text-[#14201a] focus:outline-none focus:border-[#08940c]"
                  placeholder="Ej. Semillero de IA FET o App de Pasantías"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Tipo</label>
                  <select
                    value={formExp.tipo}
                    onChange={(e) => setFormExp({ ...formExp, tipo: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  >
                    <option value="semillero">Semillero de investigación</option>
                    <option value="proyecto_aplicacion">Proyecto de aplicación</option>
                    <option value="laboral">Experiencia laboral</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Entidad / Institución</label>
                  <input
                    type="text"
                    value={formExp.entidad}
                    onChange={(e) => setFormExp({ ...formExp, entidad: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3.5 py-2 text-sm text-[#14201a]"
                    placeholder="Ej. Fundación FET"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={formExp.fecha_inicio}
                    onChange={(e) => setFormExp({ ...formExp, fecha_inicio: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha Fin (o vacío si actual)</label>
                  <input
                    type="date"
                    value={formExp.fecha_fin}
                    onChange={(e) => setFormExp({ ...formExp, fecha_fin: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Descripción de Logros y Actividades</label>
                <textarea
                  rows="3"
                  value={formExp.descripcion}
                  onChange={(e) => setFormExp({ ...formExp, descripcion: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3 text-sm text-[#14201a]"
                  placeholder="Detalla qué hiciste, tecnologías aplicadas o publicaciones logradas..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#dfe6e1]">
                <button
                  type="button"
                  onClick={() => setModalExp(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 cursor-pointer"
                >
                  Guardar Experiencia
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Registrar Horas / Formato de Asistencia (RF07) */}
      {modalAsistencia && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
              <h3 className="text-base font-extrabold text-[#14201a]">Registrar Formato de Asistencia a Pasantía</h3>
              <button onClick={() => setModalAsistencia(false)} className="text-[#5f6b64] hover:text-slate-900 font-bold cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleRegistrarAsistencia} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Pasantía Asignada</label>
                <select
                  value={formAsistencia.pasantia_id}
                  onChange={(e) => setFormAsistencia({ ...formAsistencia, pasantia_id: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                >
                  {pasantias.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.empresario?.empresa} ({p.cargo_pasantia || 'Pasante'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha de la Asistencia</label>
                  <input
                    type="date"
                    required
                    value={formAsistencia.fecha_registro}
                    onChange={(e) => setFormAsistencia({ ...formAsistencia, fecha_registro: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Horas Cumplidas</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={formAsistencia.horas_cumplidas}
                    onChange={(e) => setFormAsistencia({ ...formAsistencia, horas_cumplidas: parseInt(e.target.value) || 1 })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Semana / Periodo</label>
                <input
                  type="text"
                  value={formAsistencia.semana}
                  onChange={(e) => setFormAsistencia({ ...formAsistencia, semana: e.target.value })}
                  placeholder="Ej. Semana 1 (01/02 - 05/02)"
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Actividades Realizadas</label>
                <textarea
                  rows="3"
                  required
                  value={formAsistencia.actividades_realizadas}
                  onChange={(e) => setFormAsistencia({ ...formAsistencia, actividades_realizadas: e.target.value })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3 text-sm text-[#14201a]"
                  placeholder="Describe las tareas y avances del día cumplidos en la empresa..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Evidencia Fotográfica / Anexo (Opcional)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setFormAsistencia({ ...formAsistencia, evidencia: e.target.files?.[0] || null })}
                  className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-xs text-[#14201a] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[#e8f8ea] file:text-[#067a0a] hover:file:bg-[#d5f3d8] cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#dfe6e1]">
                <button
                  type="button"
                  onClick={() => setModalAsistencia(false)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-[#5f6b64] hover:text-slate-900 bg-slate-100 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 cursor-pointer"
                >
                  Enviar al Empresario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
