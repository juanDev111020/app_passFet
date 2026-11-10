import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import { descargarPdf, esPaseHabilitado, urlArchivo } from '../api/archivos'
import ReglaInput from '../components/ReglaInput'
import { comprimirImagen } from '../utils/imageCompressor'
import {
  filtrarSoloNumeros,
  filtrarSoloLetras,
  obtenerReglaCampo,
  normalizarError,
} from '../utils/validationHelper'

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
  const [focoCampo, setFocoCampo] = useState('')
  const [erroresPerfil, setErroresPerfil] = useState({})
  const [erroresAsistencia, setErroresAsistencia] = useState({})

  // Estado para subida y rotación de foto y firma
  const [subiendoFoto, setSubiendoFoto] = useState(false)
  const [rotandoFoto, setRotandoFoto] = useState(false)
  const [rotandoFirma, setRotandoFirma] = useState(false)
  const [orientacionFirma, setOrientacionFirma] = useState(user?.firma_orientacion || 'horizontal')

  // Control de acordeón de secciones del formato institucional
  const [seccionesAbiertas, setSeccionesAbiertas] = useState({
    superior: false,
    tecnica: false,
    cursos: false,
    laboral: false,
    investigacion: false,
    referencias: true,
  })

  const toggleSeccion = (sec) => {
    setSeccionesAbiertas((prev) => ({ ...prev, [sec]: !prev[sec] }))
  }

  // Formulario Datos de Contacto y Perfil Completo Institucional
  const [datosForm, setDatosForm] = useState({
    telefono: '',
    ciudad: '',
    direccion: '',
    linkedin: '',
    idiomas: '',
    resumen_profesional: '',
    habilidades: '',
    formacion_complementaria: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    estado_civil: 'Soltero(a)',
    rh: 'O+',
    contacto_emergencia: '',
    telefono_emergencia: '',
    datos_formato_hv: {
      maestria: { titulo: '', fecha_grado: '', institucion: '', ciudad: '', titulo_obtenido: '' },
      especializacion: { titulo: '', fecha_grado: '', institucion: '', ciudad: '', titulo_obtenido: '' },
      pregrado: { carrera: '', fecha_grado: '', institucion: '', ciudad: '', titulo_obtenido: '' },
      tecnologo: { titulo: '', fecha_grado: '', institucion: '', ciudad: '', titulo_obtenido: '', modalidad: '' },
      tecnico: { titulo: '', fecha_grado: '', institucion: '', ciudad: '', titulo_obtenido: '', modalidad: '' },
      cursos: [
        { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
        { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
        { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
      ],
      experiencia_laboral: [
        { empresa: '', cargo: '', direccion: '', telefono: '', jefe: '', dedicacion: '', fecha_inicio_fin: '', funciones: '' },
        { empresa: '', cargo: '', direccion: '', telefono: '', jefe: '', dedicacion: '', fecha_inicio_fin: '', funciones: '' },
        { empresa: '', cargo: '', direccion: '', telefono: '', jefe: '', dedicacion: '', fecha_inicio_fin: '', funciones: '' },
      ],
      investigacion: {
        grupo_nombre: '',
        grupo_tiempo: '',
        proyectos: '',
        tutorias_posgrado: '',
        tutorias_pregrado: '',
        par_evaluador: '',
        informes_tecnicos: '',
        publicaciones: '',
        organizaciones: '',
        ponencias: '',
      },
      referencia_familiar: {
        nombre: '',
        profesion: '',
        parentesco: '',
        telefono: '',
      },
      referencia_personal: {
        nombre: '',
        profesion: '',
        telefono: '',
      },
    },
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
        const hv = est.datos_formato_hv || {}
        setDatosForm({
          telefono: est.telefono || '',
          ciudad: est.ciudad || '',
          direccion: est.direccion || '',
          linkedin: est.linkedin || '',
          idiomas: est.idiomas || '',
          resumen_profesional: est.resumen_profesional || '',
          habilidades: est.habilidades || '',
          formacion_complementaria: est.formacion_complementaria || '',
          fecha_nacimiento: est.fecha_nacimiento || '',
          lugar_nacimiento: est.lugar_nacimiento || '',
          estado_civil: est.estado_civil || 'Soltero(a)',
          rh: est.rh || 'O+',
          contacto_emergencia: est.contacto_emergencia || '',
          telefono_emergencia: est.telefono_emergencia || '',
          datos_formato_hv: {
            maestria: {
              titulo: hv.maestria?.titulo || '',
              fecha_grado: hv.maestria?.fecha_grado || '',
              institucion: hv.maestria?.institucion || '',
              ciudad: hv.maestria?.ciudad || '',
              titulo_obtenido: hv.maestria?.titulo_obtenido || '',
            },
            especializacion: {
              titulo: hv.especializacion?.titulo || '',
              fecha_grado: hv.especializacion?.fecha_grado || '',
              institucion: hv.especializacion?.institucion || '',
              ciudad: hv.especializacion?.ciudad || '',
              titulo_obtenido: hv.especializacion?.titulo_obtenido || '',
            },
            pregrado: {
              carrera: hv.pregrado?.carrera || '',
              fecha_grado: hv.pregrado?.fecha_grado || '',
              institucion: hv.pregrado?.institucion || '',
              ciudad: hv.pregrado?.ciudad || '',
              titulo_obtenido: hv.pregrado?.titulo_obtenido || '',
            },
            tecnologo: {
              titulo: hv.tecnologo?.titulo || '',
              fecha_grado: hv.tecnologo?.fecha_grado || '',
              institucion: hv.tecnologo?.institucion || '',
              ciudad: hv.tecnologo?.ciudad || '',
              titulo_obtenido: hv.tecnologo?.titulo_obtenido || '',
              modalidad: hv.tecnologo?.modalidad || '',
            },
            tecnico: {
              titulo: hv.tecnico?.titulo || '',
              fecha_grado: hv.tecnico?.fecha_grado || '',
              institucion: hv.tecnico?.institucion || '',
              ciudad: hv.tecnico?.ciudad || '',
              titulo_obtenido: hv.tecnico?.titulo_obtenido || '',
              modalidad: hv.tecnico?.modalidad || '',
            },
            cursos: Array.isArray(hv.cursos) && hv.cursos.length > 0
              ? hv.cursos
              : [
                  { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
                  { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
                  { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
                ],
            experiencia_laboral: Array.isArray(hv.experiencia_laboral) && hv.experiencia_laboral.length === 3
              ? hv.experiencia_laboral
              : [
                  { empresa: hv.experiencia_laboral?.[0]?.empresa || '', cargo: hv.experiencia_laboral?.[0]?.cargo || '', direccion: hv.experiencia_laboral?.[0]?.direccion || '', telefono: hv.experiencia_laboral?.[0]?.telefono || '', jefe: hv.experiencia_laboral?.[0]?.jefe || '', dedicacion: hv.experiencia_laboral?.[0]?.dedicacion || '', fecha_inicio_fin: hv.experiencia_laboral?.[0]?.fecha_inicio_fin || '', funciones: hv.experiencia_laboral?.[0]?.funciones || '' },
                  { empresa: hv.experiencia_laboral?.[1]?.empresa || '', cargo: hv.experiencia_laboral?.[1]?.cargo || '', direccion: hv.experiencia_laboral?.[1]?.direccion || '', telefono: hv.experiencia_laboral?.[1]?.telefono || '', jefe: hv.experiencia_laboral?.[1]?.jefe || '', dedicacion: hv.experiencia_laboral?.[1]?.dedicacion || '', fecha_inicio_fin: hv.experiencia_laboral?.[1]?.fecha_inicio_fin || '', funciones: hv.experiencia_laboral?.[1]?.funciones || '' },
                  { empresa: hv.experiencia_laboral?.[2]?.empresa || '', cargo: hv.experiencia_laboral?.[2]?.cargo || '', direccion: hv.experiencia_laboral?.[2]?.direccion || '', telefono: hv.experiencia_laboral?.[2]?.telefono || '', jefe: hv.experiencia_laboral?.[2]?.jefe || '', dedicacion: hv.experiencia_laboral?.[2]?.dedicacion || '', fecha_inicio_fin: hv.experiencia_laboral?.[2]?.fecha_inicio_fin || '', funciones: hv.experiencia_laboral?.[2]?.funciones || '' },
                ],
            investigacion: {
              grupo_nombre: hv.investigacion?.grupo_nombre || '',
              grupo_tiempo: hv.investigacion?.grupo_tiempo || '',
              proyectos: hv.investigacion?.proyectos || '',
              tutorias_posgrado: hv.investigacion?.tutorias_posgrado || '',
              tutorias_pregrado: hv.investigacion?.tutorias_pregrado || '',
              par_evaluador: hv.investigacion?.par_evaluador || '',
              informes_tecnicos: hv.investigacion?.informes_tecnicos || '',
              publicaciones: hv.investigacion?.publicaciones || '',
              organizaciones: hv.investigacion?.organizaciones || '',
              ponencias: hv.investigacion?.ponencias || '',
            },
            referencia_familiar: {
              nombre: hv.referencia_familiar?.nombre || '',
              profesion: hv.referencia_familiar?.profesion || '',
              parentesco: hv.referencia_familiar?.parentesco || '',
              telefono: hv.referencia_familiar?.telefono || '',
            },
            referencia_personal: {
              nombre: hv.referencia_personal?.nombre || '',
              profesion: hv.referencia_personal?.profesion || '',
              telefono: hv.referencia_personal?.telefono || '',
            },
          },
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

  // Helpers para actualizar campos anidados del formato institucional
  const updateHvField = (seccion, campo, valor) => {
    setDatosForm((prev) => ({
      ...prev,
      datos_formato_hv: {
        ...prev.datos_formato_hv,
        [seccion]: {
          ...prev.datos_formato_hv?.[seccion],
          [campo]: valor,
        },
      },
    }))
  }

  const updateCursoField = (index, campo, valor) => {
    setDatosForm((prev) => {
      const cursos = [...(prev.datos_formato_hv?.cursos || [])]
      cursos[index] = { ...cursos[index], [campo]: valor }
      return {
        ...prev,
        datos_formato_hv: {
          ...prev.datos_formato_hv,
          cursos,
        },
      }
    })
  }

  const agregarFilaCurso = () => {
    setDatosForm((prev) => ({
      ...prev,
      datos_formato_hv: {
        ...prev.datos_formato_hv,
        cursos: [
          ...(prev.datos_formato_hv?.cursos || []),
          { tema: '', duracion: '', fecha: '', institucion: '', modalidad: '' },
        ],
      },
    }))
  }

  const eliminarFilaCurso = (index) => {
    setDatosForm((prev) => {
      const cursos = (prev.datos_formato_hv?.cursos || []).filter((_, i) => i !== index)
      return {
        ...prev,
        datos_formato_hv: {
          ...prev.datos_formato_hv,
          cursos,
        },
      }
    })
  }

  const updateExpLaboralField = (index, campo, valor) => {
    setDatosForm((prev) => {
      const laboral = [...(prev.datos_formato_hv?.experiencia_laboral || [])]
      laboral[index] = { ...laboral[index], [campo]: valor }
      return {
        ...prev,
        datos_formato_hv: {
          ...prev.datos_formato_hv,
          experiencia_laboral: laboral,
        },
      }
    })
  }

  // Guardar datos básicos y profesionales
  const handleGuardarDatos = async (e) => {
    e.preventDefault()
    setErroresPerfil({})

    const errs = {}
    if (datosForm.telefono && datosForm.telefono.length < 7) {
      errs.telefono = ['El teléfono debe contener entre 7 y 10 dígitos.']
    }
    if (Object.keys(errs).length > 0) {
      setErroresPerfil(errs)
      return
    }

    setGuardando(true)
    try {
      const res = await api.put('/perfil', datosForm)
      setEstudiante(res.data.estudiante)
      avisar('Perfil profesional actualizado con éxito.')
    } catch (err) {
      if (err.response?.data?.errors) {
        setErroresPerfil(err.response.data.errors)
      }
      avisar(normalizarError(err.response?.data?.message) || 'Error al actualizar el perfil.', 'error')
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

  // Subir Foto para Hoja de Vida (3x4) con compresión automática anti-413
  const handleSubirFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoFoto(true)
    try {
      const fileComprimido = await comprimirImagen(file, 1200, 0.88)
      const data = new FormData()
      data.append('foto', fileComprimido)
      await api.post('/perfil/foto', data)
      avisar('Foto de hoja de vida actualizada con éxito.')
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al subir la foto.', 'error')
    } finally {
      setSubiendoFoto(false)
    }
  }

  // Rotar Foto (90°)
  const handleRotarFoto = async () => {
    setRotandoFoto(true)
    try {
      await api.post('/perfil/foto/rotar', { grados: 90 })
      avisar('Foto rotada exitosamente.')
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al rotar la foto.', 'error')
    } finally {
      setRotandoFoto(false)
    }
  }

  // Subir Firma Digital (foto/imagen) con compresión automática anti-413
  const handleSubirFirma = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSubiendoArchivo(true)
    try {
      const fileComprimido = await comprimirImagen(file, 1200, 0.9)
      const data = new FormData()
      data.append('firma', fileComprimido)
      data.append('orientacion', orientacionFirma)
      await api.post('/perfil/firma', data)
      avisar('Firma digital actualizada con éxito.')
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al subir la firma.', 'error')
    } finally {
      setSubiendoArchivo(false)
    }
  }

  // Rotar Firma Digital (90°)
  const handleRotarFirma = async () => {
    setRotandoFirma(true)
    try {
      const res = await api.post('/perfil/firma/rotar', { grados: 90 })
      if (res.data?.firma_orientacion) {
        setOrientacionFirma(res.data.firma_orientacion)
      }
      avisar('Firma rotada exitosamente.')
      cargarPerfil()
    } catch (err) {
      avisar(err.response?.data?.message || 'Error al rotar la firma.', 'error')
    } finally {
      setRotandoFirma(false)
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
    setErroresAsistencia({})

    const horas = parseInt(formAsistencia.horas_cumplidas, 10)
    if (isNaN(horas) || horas < 1 || horas > 42) {
      setErroresAsistencia({ horas_cumplidas: ['Las horas cumplidas deben estar entre 1 y 42 horas por reporte semanal.'] })
      return
    }

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
      if (err.response?.data?.errors) {
        setErroresAsistencia(err.response.data.errors)
      }
      avisar(normalizarError(err.response?.data?.message) || 'Error al registrar asistencia.', 'error')
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
              <span>{user?.nombres}</span> <span>{user?.apellidos}</span>
            </h2>
            <p className="text-sm text-[#5f6b64]">
              <span>{estudiante?.programa?.nombre || 'Programa académico'}</span>
              <span> · Semestre {estudiante?.semestre ?? '—'} · Doc: </span>
              <span className="font-mono font-semibold">{user?.numero_documento}</span>
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
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Teléfono / Celular (solo números, máx 10)</label>
                  <input
                    type="text"
                    maxLength={10}
                    value={datosForm.telefono}
                    onFocus={() => setFocoCampo('perf_tel')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setDatosForm({ ...datosForm, telefono: filtrarSoloNumeros(e.target.value, 10) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Ej. 3101234567"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('telefono', datosForm.telefono, erroresPerfil.telefono, focoCampo === 'perf_tel')} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Ciudad de Residencia (solo letras)</label>
                  <input
                    type="text"
                    maxLength={60}
                    value={datosForm.ciudad}
                    onFocus={() => setFocoCampo('perf_ciudad')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setDatosForm({ ...datosForm, ciudad: filtrarSoloLetras(e.target.value, 60) })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    placeholder="Ej. Neiva Huila"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('cargo', datosForm.ciudad, erroresPerfil.ciudad, focoCampo === 'perf_ciudad')} />
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

              <div className="border-t border-[#dfe6e1] pt-3">
                <h4 className="text-xs font-bold text-[#067a0a] uppercase tracking-wider mb-3">Datos del Formato Institucional FET (PA-GTH-F-10)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Fecha de Nacimiento</label>
                    <input
                      type="date"
                      value={datosForm.fecha_nacimiento}
                      onChange={(e) => setDatosForm({ ...datosForm, fecha_nacimiento: e.target.value })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Lugar de Nacimiento</label>
                    <input
                      type="text"
                      maxLength={60}
                      value={datosForm.lugar_nacimiento}
                      onChange={(e) => setDatosForm({ ...datosForm, lugar_nacimiento: e.target.value })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                      placeholder="Ej. Neiva, Huila"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Estado Civil</label>
                    <select
                      value={datosForm.estado_civil}
                      onChange={(e) => setDatosForm({ ...datosForm, estado_civil: e.target.value })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    >
                      <option value="Soltero(a)">Soltero(a)</option>
                      <option value="Casado(a)">Casado(a)</option>
                      <option value="Unión Libre">Unión Libre</option>
                      <option value="Divorciado(a)">Divorciado(a)</option>
                      <option value="Viudo(a)">Viudo(a)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Grupo Sanguíneo (R-H)</label>
                    <select
                      value={datosForm.rh}
                      onChange={(e) => setDatosForm({ ...datosForm, rh: e.target.value })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                    >
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Contacto de Emergencia</label>
                    <input
                      type="text"
                      value={datosForm.contacto_emergencia}
                      onChange={(e) => setDatosForm({ ...datosForm, contacto_emergencia: e.target.value })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                      placeholder="Nombre de familiar / contacto"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Teléfono Emergencia</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={datosForm.telefono_emergencia}
                      onChange={(e) => setDatosForm({ ...datosForm, telefono_emergencia: filtrarSoloNumeros(e.target.value, 10) })}
                      className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] focus:ring-4 focus:ring-[#08940c]/10 rounded-xl px-3.5 py-2.5 text-sm text-[#14201a]"
                      placeholder="Ej. 3151234567"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: FORMACIÓN ACADÉMICA (PLANTILLA INSTITUCIONAL FET) */}
              <div className="border border-[#dfe6e1] rounded-2xl p-5 bg-[#fafcfa] space-y-4">
                <div className="flex items-center justify-between border-b border-[#dfe6e1] pb-3">
                  <div>
                    <h4 className="text-sm font-extrabold text-[#14201a] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#08940c]"></span>
                      2. Formación Académica (Plantilla Oficial)
                    </h4>
                    <p className="text-xs text-[#5f6b64]">Educación superior, técnica, diplomados y cursos. Déjalos en blanco si aún no aplican.</p>
                  </div>
                </div>

                {/* 2.1 Educación Superior */}
                <div className="border border-[#dfe6e1] rounded-xl bg-white p-4 space-y-3">
                  <div
                    onClick={() => toggleSeccion('superior')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-[#14201a] uppercase tracking-wide">
                      2.1 Educación Superior (Maestría, Especialización, Pregrado)
                    </span>
                    <span className="text-xs font-bold text-[#08940c]">
                      {seccionesAbiertas.superior ? 'Ocultar ▲' : 'Ver campos ▼'}
                    </span>
                  </div>

                  {seccionesAbiertas.superior && (
                    <div className="space-y-4 pt-2 border-t border-[#f0f4f1]">
                      {/* Maestría */}
                      <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dfe6e1] space-y-2.5">
                        <span className="text-xs font-bold text-[#067a0a] uppercase tracking-wider block">Maestría (Opcional)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título de Maestría</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.maestria?.titulo || ''}
                              onChange={(e) => updateHvField('maestria', 'titulo', e.target.value)}
                              placeholder="Ej. Magíster en Ingeniería de Software"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.maestria?.institucion || ''}
                              onChange={(e) => updateHvField('maestria', 'institucion', e.target.value)}
                              placeholder="Ej. Universidad Nacional"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Grado</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.maestria?.fecha_grado || ''}
                              onChange={(e) => updateHvField('maestria', 'fecha_grado', e.target.value)}
                              placeholder="Ej. 15/12/2023 o 2023"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">País y Ciudad</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.maestria?.ciudad || ''}
                              onChange={(e) => updateHvField('maestria', 'ciudad', e.target.value)}
                              placeholder="Ej. Bogotá, Colombia"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título Obtenido</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.maestria?.titulo_obtenido || ''}
                              onChange={(e) => updateHvField('maestria', 'titulo_obtenido', e.target.value)}
                              placeholder="Ej. Magíster"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Especialización */}
                      <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dfe6e1] space-y-2.5">
                        <span className="text-xs font-bold text-[#067a0a] uppercase tracking-wider block">Especialización (Opcional)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título de Especialización</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.especializacion?.titulo || ''}
                              onChange={(e) => updateHvField('especializacion', 'titulo', e.target.value)}
                              placeholder="Ej. Especialista en Seguridad de la Información"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.especializacion?.institucion || ''}
                              onChange={(e) => updateHvField('especializacion', 'institucion', e.target.value)}
                              placeholder="Ej. Fundación Escuela Tecnológica de Neiva - FET"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Grado</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.especializacion?.fecha_grado || ''}
                              onChange={(e) => updateHvField('especializacion', 'fecha_grado', e.target.value)}
                              placeholder="Ej. 2024"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">País y Ciudad</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.especializacion?.ciudad || ''}
                              onChange={(e) => updateHvField('especializacion', 'ciudad', e.target.value)}
                              placeholder="Ej. Neiva, Colombia"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título Obtenido</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.especializacion?.titulo_obtenido || ''}
                              onChange={(e) => updateHvField('especializacion', 'titulo_obtenido', e.target.value)}
                              placeholder="Ej. Especialista"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Pregrado Adicional / Especificación */}
                      <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dfe6e1] space-y-2.5">
                        <span className="text-xs font-bold text-[#067a0a] uppercase tracking-wider block">Pregrado (Opcional - por defecto se toma tu carrera actual FET)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Carrera / Título</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.pregrado?.carrera || ''}
                              onChange={(e) => updateHvField('pregrado', 'carrera', e.target.value)}
                              placeholder={estudiante?.programa?.nombre || 'Ej. Ingeniería de Software'}
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.pregrado?.institucion || ''}
                              onChange={(e) => updateHvField('pregrado', 'institucion', e.target.value)}
                              placeholder="Fundación Escuela Tecnológica de Neiva - FET"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Grado</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.pregrado?.fecha_grado || ''}
                              onChange={(e) => updateHvField('pregrado', 'fecha_grado', e.target.value)}
                              placeholder="Ej. En curso / 2026"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">País y Ciudad</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.pregrado?.ciudad || ''}
                              onChange={(e) => updateHvField('pregrado', 'ciudad', e.target.value)}
                              placeholder="Neiva, Colombia"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título Obtenido</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.pregrado?.titulo_obtenido || ''}
                              onChange={(e) => updateHvField('pregrado', 'titulo_obtenido', e.target.value)}
                              placeholder="Ej. Ingeniero(a)"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2.2 Formación Técnica y Tecnológica */}
                <div className="border border-[#dfe6e1] rounded-xl bg-white p-4 space-y-3">
                  <div
                    onClick={() => toggleSeccion('tecnica')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <span className="text-xs font-bold text-[#14201a] uppercase tracking-wide">
                      2.2 Formación Técnica y Tecnológica (Opcional)
                    </span>
                    <span className="text-xs font-bold text-[#08940c]">
                      {seccionesAbiertas.tecnica ? 'Ocultar ▲' : 'Ver campos ▼'}
                    </span>
                  </div>

                  {seccionesAbiertas.tecnica && (
                    <div className="space-y-4 pt-2 border-t border-[#f0f4f1]">
                      {/* Tecnólogo */}
                      <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dfe6e1] space-y-2.5">
                        <span className="text-xs font-bold text-[#067a0a] uppercase tracking-wider block">Tecnólogo (Opcional)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.titulo || ''}
                              onChange={(e) => updateHvField('tecnologo', 'titulo', e.target.value)}
                              placeholder="Ej. Tecnólogo en Desarrollo de Software"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.institucion || ''}
                              onChange={(e) => updateHvField('tecnologo', 'institucion', e.target.value)}
                              placeholder="Ej. FET / SENA"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Grado</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.fecha_grado || ''}
                              onChange={(e) => updateHvField('tecnologo', 'fecha_grado', e.target.value)}
                              placeholder="Ej. 2022"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">País y Ciudad</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.ciudad || ''}
                              onChange={(e) => updateHvField('tecnologo', 'ciudad', e.target.value)}
                              placeholder="Ej. Neiva, Colombia"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título Obtenido</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.titulo_obtenido || ''}
                              onChange={(e) => updateHvField('tecnologo', 'titulo_obtenido', e.target.value)}
                              placeholder="Ej. Tecnólogo"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Modalidad de Estudio</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnologo?.modalidad || ''}
                              onChange={(e) => updateHvField('tecnologo', 'modalidad', e.target.value)}
                              placeholder="Ej. Presencial / Virtual"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Técnico */}
                      <div className="p-3 bg-[#f8faf9] rounded-xl border border-[#dfe6e1] space-y-2.5">
                        <span className="text-xs font-bold text-[#067a0a] uppercase tracking-wider block">Técnico (Opcional)</span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.titulo || ''}
                              onChange={(e) => updateHvField('tecnico', 'titulo', e.target.value)}
                              placeholder="Ej. Técnico en Sistemas"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.institucion || ''}
                              onChange={(e) => updateHvField('tecnico', 'institucion', e.target.value)}
                              placeholder="Ej. SENA / Colegio Técnico"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Grado</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.fecha_grado || ''}
                              onChange={(e) => updateHvField('tecnico', 'fecha_grado', e.target.value)}
                              placeholder="Ej. 2020"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">País y Ciudad</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.ciudad || ''}
                              onChange={(e) => updateHvField('tecnico', 'ciudad', e.target.value)}
                              placeholder="Ej. Neiva, Colombia"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Título Obtenido</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.titulo_obtenido || ''}
                              onChange={(e) => updateHvField('tecnico', 'titulo_obtenido', e.target.value)}
                              placeholder="Ej. Técnico"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Modalidad de Estudio</label>
                            <input
                              type="text"
                              value={datosForm.datos_formato_hv?.tecnico?.modalidad || ''}
                              onChange={(e) => updateHvField('tecnico', 'modalidad', e.target.value)}
                              placeholder="Ej. Presencial"
                              className="w-full bg-white border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Diplomados, Cursos, Seminarios y Actualizaciones */}
                <div className="border border-[#dfe6e1] rounded-xl bg-white p-4 space-y-3">
                  <div
                    onClick={() => toggleSeccion('cursos')}
                    className="flex items-center justify-between cursor-pointer select-none"
                  >
                    <div>
                      <span className="text-xs font-bold text-[#14201a] uppercase tracking-wide block">
                        Diplomados, Cursos, Seminarios y Actualizaciones
                      </span>
                      <span className="text-[11px] text-[#5f6b64]">
                        Tabla oficial de capacitaciones ({(datosForm.datos_formato_hv?.cursos || []).length} filas)
                      </span>
                    </div>
                    <span className="text-xs font-bold text-[#08940c]">
                      {seccionesAbiertas.cursos ? 'Ocultar ▲' : 'Ver / Editar ▼'}
                    </span>
                  </div>

                  {seccionesAbiertas.cursos && (
                    <div className="space-y-3 pt-2 border-t border-[#f0f4f1]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#f8faf9] text-[#14201a] border-b border-[#dfe6e1]">
                              <th className="p-2 font-bold uppercase text-[10px]">Tema / Nombre</th>
                              <th className="p-2 font-bold uppercase text-[10px] w-24">Duración</th>
                              <th className="p-2 font-bold uppercase text-[10px] w-24">Fecha</th>
                              <th className="p-2 font-bold uppercase text-[10px]">Institución</th>
                              <th className="p-2 font-bold uppercase text-[10px] w-28">Modalidad</th>
                              <th className="p-2 w-10"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#dfe6e1]">
                            {(datosForm.datos_formato_hv?.cursos || []).map((c, idx) => (
                              <tr key={idx} className="hover:bg-[#fafcfa]">
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={c.tema || ''}
                                    onChange={(e) => updateCursoField(idx, 'tema', e.target.value)}
                                    placeholder="Ej. Curso de React Native"
                                    className="w-full bg-white border border-[#dfe6e1] rounded-lg px-2 py-1 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={c.duracion || ''}
                                    onChange={(e) => updateCursoField(idx, 'duracion', e.target.value)}
                                    placeholder="40 horas"
                                    className="w-full bg-white border border-[#dfe6e1] rounded-lg px-2 py-1 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={c.fecha || ''}
                                    onChange={(e) => updateCursoField(idx, 'fecha', e.target.value)}
                                    placeholder="2024"
                                    className="w-full bg-white border border-[#dfe6e1] rounded-lg px-2 py-1 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={c.institucion || ''}
                                    onChange={(e) => updateCursoField(idx, 'institucion', e.target.value)}
                                    placeholder="SENA / FET"
                                    className="w-full bg-white border border-[#dfe6e1] rounded-lg px-2 py-1 text-xs"
                                  />
                                </td>
                                <td className="p-1.5">
                                  <input
                                    type="text"
                                    value={c.modalidad || ''}
                                    onChange={(e) => updateCursoField(idx, 'modalidad', e.target.value)}
                                    placeholder="Virtual"
                                    className="w-full bg-white border border-[#dfe6e1] rounded-lg px-2 py-1 text-xs"
                                  />
                                </td>
                                <td className="p-1.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => eliminarFilaCurso(idx)}
                                    className="text-red-500 hover:text-red-700 font-bold px-1.5 py-0.5 rounded text-xs cursor-pointer"
                                    title="Eliminar fila"
                                  >
                                    ✕
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="flex justify-start">
                        <button
                          type="button"
                          onClick={agregarFilaCurso}
                          className="px-3 py-1.5 rounded-lg bg-[#e8f8ea] text-[#067a0a] hover:bg-[#d5f3d8] font-bold text-xs border border-[#08940c]/30 cursor-pointer flex items-center gap-1 transition-all"
                        >
                          <span>+</span>
                          <span>Agregar otra fila de curso</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SECCIÓN 3: EXPERIENCIA LABORAL ADICIONAL (FORMATO INSTITUCIONAL) */}
              <div className="border border-[#dfe6e1] rounded-2xl p-5 bg-[#fafcfa] space-y-4">
                <div
                  onClick={() => toggleSeccion('laboral')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-[#14201a] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#08940c]"></span>
                      3. Experiencia Laboral Institucional (Opcional - Hasta 3 cargos)
                    </h4>
                    <p className="text-xs text-[#5f6b64]">Registra cargos y empleos para el formato. Las que dejes vacías aparecerán en blanco.</p>
                  </div>
                  <span className="text-xs font-bold text-[#08940c]">
                    {seccionesAbiertas.laboral ? 'Ocultar ▲' : 'Ver campos ▼'}
                  </span>
                </div>

                {seccionesAbiertas.laboral && (
                  <div className="space-y-4 pt-2 border-t border-[#f0f4f1]">
                    {[0, 1, 2].map((idx) => {
                      const exp = datosForm.datos_formato_hv?.experiencia_laboral?.[idx] || {}
                      return (
                        <div key={idx} className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                          <span className="text-xs font-extrabold text-[#067a0a] uppercase tracking-wider block">
                            Experiencia Laboral #{idx + 1}
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Institución / Empresa</label>
                              <input
                                type="text"
                                value={exp.empresa || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'empresa', e.target.value)}
                                placeholder="Ej. Soluciones TIC S.A.S."
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Nombre del Cargo</label>
                              <input
                                type="text"
                                value={exp.cargo || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'cargo', e.target.value)}
                                placeholder="Ej. Auxiliar de Desarrollo"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Dirección</label>
                              <input
                                type="text"
                                value={exp.direccion || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'direccion', e.target.value)}
                                placeholder="Ej. Cra 5 # 12-40"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Teléfonos</label>
                              <input
                                type="text"
                                value={exp.telefono || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'telefono', e.target.value)}
                                placeholder="Ej. 3110000000"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Nombre del Jefe Inmediato</label>
                              <input
                                type="text"
                                value={exp.jefe || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'jefe', e.target.value)}
                                placeholder="Ej. Ing. Carlos Pérez"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Dedicación</label>
                              <input
                                type="text"
                                value={exp.dedicacion || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'dedicacion', e.target.value)}
                                placeholder="Ej. Tiempo Completo / Prácticas"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Fecha de Inicio y Terminación</label>
                              <input
                                type="text"
                                value={exp.fecha_inicio_fin || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'fecha_inicio_fin', e.target.value)}
                                placeholder="Ej. Enero 2023 - Diciembre 2023"
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Funciones Desarrolladas</label>
                              <textarea
                                rows="2"
                                value={exp.funciones || ''}
                                onChange={(e) => updateExpLaboralField(idx, 'funciones', e.target.value)}
                                placeholder="Describe brevemente tus funciones principales en este cargo..."
                                className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl p-2.5 text-xs text-[#14201a]"
                              />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* SECCIÓN 4: EXPERIENCIA ACADÉMICA EN INVESTIGACTIVA */}
              <div className="border border-[#dfe6e1] rounded-2xl p-5 bg-[#fafcfa] space-y-4">
                <div
                  onClick={() => toggleSeccion('investigacion')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-[#14201a] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#08940c]"></span>
                      4. Experiencia Académica en Investigactiva (Opcional)
                    </h4>
                    <p className="text-xs text-[#5f6b64]">Semilleros, proyectos, ponencias y publicaciones. Puedes dejar en blanco lo que no aplique.</p>
                  </div>
                  <span className="text-xs font-bold text-[#08940c]">
                    {seccionesAbiertas.investigacion ? 'Ocultar ▲' : 'Ver campos ▼'}
                  </span>
                </div>

                {seccionesAbiertas.investigacion && (
                  <div className="space-y-4 pt-2 border-t border-[#f0f4f1]">
                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">4.1 Pertenencia a Grupos de Investigación</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Nombre del Grupo</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.grupo_nombre || ''}
                            onChange={(e) => updateHvField('investigacion', 'grupo_nombre', e.target.value)}
                            placeholder="Ej. Grupo de Investigación GESTI / FET"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Tiempo de Vinculación</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.grupo_tiempo || ''}
                            onChange={(e) => updateHvField('investigacion', 'grupo_tiempo', e.target.value)}
                            placeholder="Ej. 1 año / 2023 - 2024"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-2">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">4.2 Proyectos de Investigación Desarrollados</span>
                      <textarea
                        rows="2"
                        value={datosForm.datos_formato_hv?.investigacion?.proyectos || ''}
                        onChange={(e) => updateHvField('investigacion', 'proyectos', e.target.value)}
                        placeholder="Nombre y descripción de proyectos de investigación en los que has participado..."
                        className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl p-2.5 text-xs text-[#14201a]"
                      />
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">4.3 Dirección / Tutorías Concluidas</span>
                      <div>
                        <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Tutorías trabajos de culminación de posgrado</label>
                        <input
                          type="text"
                          value={datosForm.datos_formato_hv?.investigacion?.tutorias_posgrado || ''}
                          onChange={(e) => updateHvField('investigacion', 'tutorias_posgrado', e.target.value)}
                          placeholder="Dejar en blanco si no aplica"
                          className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Tutorías trabajos de culminación de pregrado</label>
                        <input
                          type="text"
                          value={datosForm.datos_formato_hv?.investigacion?.tutorias_pregrado || ''}
                          onChange={(e) => updateHvField('investigacion', 'tutorias_pregrado', e.target.value)}
                          placeholder="Dejar en blanco si no aplica"
                          className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                        />
                      </div>
                    </div>

                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">4.4 a 4.8 Otros Logros de Investigación</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">4.4 Par Evaluador / Jurado</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.par_evaluador || ''}
                            onChange={(e) => updateHvField('investigacion', 'par_evaluador', e.target.value)}
                            placeholder="Dejar en blanco si no aplica"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">4.5 Trabajos e Informes Técnicos</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.informes_tecnicos || ''}
                            onChange={(e) => updateHvField('investigacion', 'informes_tecnicos', e.target.value)}
                            placeholder="Dejar en blanco si no aplica"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">4.6 Publicaciones</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.publicaciones || ''}
                            onChange={(e) => updateHvField('investigacion', 'publicaciones', e.target.value)}
                            placeholder="Dejar en blanco si no aplica"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">4.7 Pertenencia a Organizaciones</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.organizaciones || ''}
                            onChange={(e) => updateHvField('investigacion', 'organizaciones', e.target.value)}
                            placeholder="Dejar en blanco si no aplica"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">4.8 Ponencias</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.investigacion?.ponencias || ''}
                            onChange={(e) => updateHvField('investigacion', 'ponencias', e.target.value)}
                            placeholder="Dejar en blanco si no aplica"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN 5: REFERENCIAS (FAMILIAR Y PERSONAL) */}
              <div className="border border-[#dfe6e1] rounded-2xl p-5 bg-[#fafcfa] space-y-4">
                <div
                  onClick={() => toggleSeccion('referencias')}
                  className="flex items-center justify-between cursor-pointer select-none"
                >
                  <div>
                    <h4 className="text-sm font-extrabold text-[#14201a] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#08940c]"></span>
                      5. Referencias (Familiar y Personal)
                    </h4>
                    <p className="text-xs text-[#5f6b64]">Datos de referencia para la sección final del formato institucional.</p>
                  </div>
                  <span className="text-xs font-bold text-[#08940c]">
                    {seccionesAbiertas.referencias ? 'Ocultar ▲' : 'Ver campos ▼'}
                  </span>
                </div>

                {seccionesAbiertas.referencias && (
                  <div className="space-y-4 pt-2 border-t border-[#f0f4f1]">
                    {/* Referencia Familiar */}
                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">Referencia Familiar</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_familiar?.nombre || ''}
                            onChange={(e) => updateHvField('referencia_familiar', 'nombre', e.target.value)}
                            placeholder={datosForm.contacto_emergencia || 'Ej. María Pérez Gómez'}
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Profesión u Ocupación</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_familiar?.profesion || ''}
                            onChange={(e) => updateHvField('referencia_familiar', 'profesion', e.target.value)}
                            placeholder="Ej. Docente / Comerciante"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Parentesco</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_familiar?.parentesco || ''}
                            onChange={(e) => updateHvField('referencia_familiar', 'parentesco', e.target.value)}
                            placeholder="Ej. Madre / Padre / Hermano(a)"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_familiar?.telefono || ''}
                            onChange={(e) => updateHvField('referencia_familiar', 'telefono', e.target.value)}
                            placeholder={datosForm.telefono_emergencia || 'Ej. 3150000000'}
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Referencia Personal */}
                    <div className="p-4 bg-white rounded-xl border border-[#dfe6e1] space-y-3">
                      <span className="text-xs font-bold text-[#067a0a] uppercase block">Referencia Personal</span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Nombre Completo</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_personal?.nombre || ''}
                            onChange={(e) => updateHvField('referencia_personal', 'nombre', e.target.value)}
                            placeholder="Ej. Juan Manuel Torres"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Profesión u Ocupación</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_personal?.profesion || ''}
                            onChange={(e) => updateHvField('referencia_personal', 'profesion', e.target.value)}
                            placeholder="Ej. Ingeniero de Sistemas"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-[#5f6b64] uppercase mb-1">Teléfono</label>
                          <input
                            type="text"
                            value={datosForm.datos_formato_hv?.referencia_personal?.telefono || ''}
                            onChange={(e) => updateHvField('referencia_personal', 'telefono', e.target.value)}
                            placeholder="Ej. 3100000000"
                            className="w-full bg-[#f8faf9] border border-[#dfe6e1] focus:border-[#08940c] rounded-xl px-3 py-2 text-xs text-[#14201a]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
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

          {/* Columna Derecha: Foto 3x4, Firma Digital, Hoja de Vida PDF externa y Pasantías */}
          <div className="space-y-6">
            {/* Foto de Hoja de Vida (3x4) */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2">
                <h3 className="text-base font-extrabold text-[#14201a]">Foto Hoja de Vida (3x4)</h3>
                <p className="text-xs text-[#5f6b64]">Sube tu fotografía formal para la plantilla institucional de la FET.</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-[105px] h-[135px] border-2 border-[#648F59] rounded-xl overflow-hidden bg-[#fafcfa] flex items-center justify-center shadow-sm">
                  {(user?.foto || estudiante?.foto) ? (
                    <img
                      src={urlArchivo(user?.foto || estudiante?.foto)}
                      alt="Foto Estudiante"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-center p-2 text-[#648F59] font-bold text-xs">
                      FOTO<br />3 x 4
                    </div>
                  )}
                </div>
                {(user?.foto || estudiante?.foto) ? (
                  <div className="flex items-center gap-2 mt-2.5">
                    <span className="text-[11px] font-bold text-[#067a0a]">✓ Foto guardada</span>
                    <button
                      type="button"
                      onClick={handleRotarFoto}
                      disabled={rotandoFoto}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-lg border border-[#08940c]/30 cursor-pointer flex items-center gap-1 transition-all"
                      title="Girar 90 grados si se cargó de lado"
                    >
                      <span>🔄</span>
                      <span>{rotandoFoto ? 'Girando...' : 'Rotar 90°'}</span>
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#5f6b64] mt-2">Sin foto cargada aún</p>
                )}
              </div>

              <label className="block w-full py-2.5 px-4 text-center rounded-xl bg-[#e8f8ea] hover:bg-[#d5f3d8] text-[#067a0a] text-xs font-bold border border-[#08940c]/30 cursor-pointer transition-all">
                <span>{subiendoFoto ? 'Cargando foto...' : ((user?.foto || estudiante?.foto) ? 'Cambiar Foto 3x4' : 'Subir Foto 3x4')}</span>
                <input type="file" accept="image/*" onChange={handleSubirFoto} className="hidden" />
              </label>
            </div>

            {/* Foto de Firma Digital */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2">
                <h3 className="text-base font-extrabold text-[#14201a]">Firma Digital (Foto)</h3>
                <p className="text-xs text-[#5f6b64]">Sube la foto de tu firma para estamparla en documentos institucionales y en tu hoja de vida.</p>
              </div>

              {user?.firma_digital ? (
                <div className="p-4 bg-[#f8faf9] rounded-2xl border border-[#dfe6e1] flex flex-col items-center">
                  <div className="w-full max-w-[260px] h-[90px] flex items-center justify-center p-2 bg-white rounded-xl border border-dashed border-[#08940c]/40">
                    <img
                      src={urlArchivo(user.firma_digital)}
                      alt="Firma Digital"
                      className="max-h-[80px] max-w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between w-full mt-3 pt-2 border-t border-[#dfe6e1]">
                    <span className="text-[11px] font-bold text-[#067a0a]">✓ Firma guardada</span>
                    <button
                      type="button"
                      onClick={handleRotarFirma}
                      disabled={rotandoFirma}
                      className="px-2.5 py-1 text-[11px] font-bold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] rounded-lg border border-[#08940c]/30 cursor-pointer flex items-center gap-1 transition-all"
                      title="Girar 90 grados si se visualiza vertical u horizontal invertida"
                    >
                      <span>🔄</span>
                      <span>{rotandoFirma ? 'Girando...' : 'Rotar 90°'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-[#fdecea] rounded-2xl border border-red-200 text-center text-xs text-[#d93025]">
                  Aún no has registrado tu foto de firma.
                </div>
              )}

              <div className="flex items-center justify-between text-xs font-semibold text-[#5f6b64]">
                <span>Orientación deseada:</span>
                <select
                  value={orientacionFirma}
                  onChange={(e) => setOrientacionFirma(e.target.value)}
                  className="bg-[#f8faf9] border border-[#dfe6e1] text-xs font-bold rounded-lg px-2 py-1 text-[#14201a]"
                >
                  <option value="horizontal">Horizontal (Normal)</option>
                  <option value="vertical">Vertical</option>
                </select>
              </div>

              <label className="block w-full py-2.5 px-4 text-center rounded-xl bg-[#e8f8ea] hover:bg-[#d5f3d8] text-[#067a0a] text-xs font-bold border border-[#08940c]/30 cursor-pointer transition-all">
                <span>{user?.firma_digital ? 'Cambiar Foto de Firma' : 'Subir Foto de Firma'}</span>
                <input type="file" accept="image/*" onChange={handleSubirFirma} className="hidden" />
              </label>
            </div>

            {/* Hoja de Vida en PDF personalizado (RF06) */}
            <div className="bg-white border border-[#dfe6e1] rounded-3xl p-6 shadow-sm space-y-4">
              <div className="border-b border-[#dfe6e1] pb-2">
                <h3 className="text-base font-extrabold text-[#14201a]">Hoja de Vida en PDF (Requisito)</h3>
                <p className="text-xs text-[#5f6b64]">Para que los coordinadores y empresarios puedan consultar o descargar tu hoja de vida, debes tenerla cargada aquí.</p>
              </div>

              {estudiante?.hoja_vida_pdf ? (
                <div className="p-3 bg-[#e8f8ea] rounded-2xl border border-[#08940c]/30 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-[#067a0a]">✓ Hoja de vida activa y visible</p>
                    <a
                      href={urlArchivo(estudiante.hoja_vida_pdf)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-bold text-[#08940c] hover:underline"
                    >
                      Ver documento PDF ↗
                    </a>
                  </div>
                  <span className="text-xs text-[#067a0a] font-bold">Habilitada</span>
                </div>
              ) : (
                <div className="p-3 bg-[#fff8e1] rounded-2xl border border-amber-300 text-xs text-amber-800 space-y-1">
                  <p className="font-bold">⚠️ Pendiente por subir</p>
                  <p className="text-[11px] leading-relaxed">Los coordinadores (Admin) y empresas no podrán ver ni descargar tu hoja de vida hasta que cargues tu PDF aquí.</p>
                </div>
              )}

              <label className="block w-full py-2.5 px-4 text-center rounded-xl bg-white hover:bg-[#f8faf9] text-[#14201a] text-xs font-bold border border-[#dfe6e1] cursor-pointer transition-all">
                <span>{subiendoArchivo ? 'Subiendo...' : (estudiante?.hoja_vida_pdf ? 'Reemplazar PDF de Hoja de Vida' : 'Subir PDF de Hoja de Vida')}</span>
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
                  <label className="block text-xs font-bold text-[#14201a] uppercase mb-1">Horas Cumplidas (1 a 42)</label>
                  <input
                    type="number"
                    min="1"
                    max="42"
                    required
                    value={formAsistencia.horas_cumplidas}
                    onFocus={() => setFocoCampo('asist_horas')}
                    onBlur={() => setFocoCampo('')}
                    onChange={(e) => setFormAsistencia({ ...formAsistencia, horas_cumplidas: e.target.value })}
                    className="w-full bg-[#f8faf9] border border-[#dfe6e1] rounded-xl px-3 py-2 text-sm text-[#14201a]"
                  />
                  <ReglaInput mensaje={obtenerReglaCampo('horas', formAsistencia.horas_cumplidas, erroresAsistencia.horas_cumplidas, focoCampo === 'asist_horas')} />
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
