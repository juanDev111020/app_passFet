import { useState } from 'react'
import { descargarPdf, esPaseHabilitado, urlArchivo } from '../api/archivos'

const TIPOS = {
  semillero: 'Semillero de investigación',
  proyecto_aplicacion: 'Proyecto de aplicación',
  laboral: 'Experiencia laboral',
  otro: 'Otro',
}

const Dato = ({ etiqueta, valor }) => (
  <div className="bg-[#f8faf9] border border-[#dfe6e1] rounded-xl p-3">
    <span className="text-[10px] text-[#5f6b64] uppercase font-bold">{etiqueta}</span>
    <p className="text-sm font-bold text-[#14201a] mt-0.5 break-words">{valor || '—'}</p>
  </div>
)

// Vista de SOLO LECTURA de la hoja de vida de un estudiante (Admin / Empresario)
export default function HojaVidaVista({ estudiante, onCerrar }) {
  const [descargando, setDescargando] = useState(false)
  const [errorDescarga, setErrorDescarga] = useState(null)
  const e = estudiante
  const habilitado = esPaseHabilitado(e?.pase?.estado)
  const tieneHvSubida = Boolean(e?.hoja_vida_pdf)
  const fotoEstudiante = e?.foto || e?.user?.foto

  const descargar = async () => {
    if (!tieneHvSubida) {
      setErrorDescarga('El estudiante aún no ha subido su hoja de vida institucional. No es posible descargarla.')
      return
    }
    setDescargando(true)
    setErrorDescarga(null)
    try {
      await descargarPdf(`/estudiantes/${e.id}/hoja-vida/pdf`, `hoja_de_vida_${e.user?.numero_documento}.pdf`)
    } catch (err) {
      setErrorDescarga(err.response?.data?.message || 'Error al descargar la hoja de vida.')
    } finally {
      setDescargando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white border border-[#dfe6e1] rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden my-4">
        {/* Cabecera verde FET con Foto Simétrica */}
        <div className="bg-gradient-to-r from-[#08940c] to-[#067a0a] text-white p-6 relative">
          <button onClick={onCerrar} className="absolute top-4 right-4 text-white/80 hover:text-white font-bold cursor-pointer text-lg" aria-label="Cerrar">✕</button>
          
          <div className="flex items-center gap-4">
            {/* Foto 3x4 simétrica */}
            <div className="w-[72px] h-[92px] rounded-xl border-2 border-white/80 overflow-hidden bg-black/15 flex-shrink-0 flex items-center justify-center shadow-md">
              {fotoEstudiante ? (
                <img src={urlArchivo(fotoEstudiante)} alt="Foto Estudiante" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-[10px] font-bold text-white/80 leading-tight">
                  FOTO<br />3x4
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest opacity-80 font-bold">Hoja de vida · Solo lectura (FET)</p>
              <h3 className="text-xl font-extrabold capitalize truncate mt-0.5">{e.user?.nombres} {e.user?.apellidos}</h3>
              <p className="text-xs opacity-90 truncate">{e.programa?.nombre} · Semestre {e.semestre}</p>
              
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${habilitado ? 'bg-white text-[#067a0a]' : 'bg-[#fdecea] text-[#d93025]'}`}>
                  {habilitado ? '● Habilitado para pasantía' : '● Inhabilitado'}
                </span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${tieneHvSubida ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'}`}>
                  {tieneHvSubida ? '✓ H.V. Subida' : '⚠️ Sin H.V. subida'}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Alerta si el estudiante no ha subido la Hoja de Vida */}
          {!tieneHvSubida && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-800 text-xs">
              <span className="text-lg leading-none mt-0.5">⚠️</span>
              <div>
                <p className="font-bold text-amber-900">Hoja de vida no subida por el estudiante</p>
                <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                  El estudiante aún no ha cargado su Hoja de Vida oficial en su perfil. Por política institucional, no es posible visualizar el archivo original ni descargar el PDF oficial hasta que sea cargado por el estudiante.
                </p>
              </div>
            </div>
          )}

          {errorDescarga && (
            <div className="p-3 bg-red-50 border border-red-300 rounded-xl text-red-700 text-xs font-semibold">
              {errorDescarga}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <Dato etiqueta="Documento" valor={e.user?.numero_documento} />
            <Dato etiqueta="Cód. estudiantil" valor={e.codigo_estudiantil} />
            <Dato etiqueta="Teléfono" valor={e.telefono} />
            <Dato etiqueta="Correo" valor={e.user?.email} />
            <Dato etiqueta="Ciudad de residencia" valor={e.ciudad} />
            <Dato etiqueta="LinkedIn / Portafolio" valor={e.linkedin} />
            <Dato etiqueta="Fecha de nacimiento" valor={e.fecha_nacimiento} />
            <Dato etiqueta="Lugar de nacimiento" valor={e.lugar_nacimiento} />
            <Dato etiqueta="Estado civil" valor={e.estado_civil} />
            <Dato etiqueta="Grupo Sanguíneo (R-H)" valor={e.rh} />
            <Dato etiqueta="Contacto de emergencia" valor={e.contacto_emergencia} />
            <Dato etiqueta="Teléfono de emergencia" valor={e.telefono_emergencia} />
          </div>

          {e.resumen_profesional && (
            <section>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#067a0a] border-b-2 border-[#08940c] pb-1 mb-2">Perfil profesional</h4>
              <p className="text-sm text-[#14201a] leading-relaxed whitespace-pre-line">{e.resumen_profesional}</p>
            </section>
          )}

          {e.habilidades && (
            <section>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#067a0a] border-b-2 border-[#08940c] pb-1 mb-2">Habilidades</h4>
              <div className="flex flex-wrap gap-2">
                {e.habilidades.split(/[,\n]+/).filter(Boolean).map((h, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-full bg-[#e8f8ea] text-[#067a0a] text-xs font-bold">{h.trim()}</span>
                ))}
              </div>
            </section>
          )}

          {(e.idiomas || e.formacion_complementaria) && (
            <section className="grid sm:grid-cols-2 gap-3">
              {e.idiomas && <Dato etiqueta="Idiomas" valor={e.idiomas} />}
              {e.formacion_complementaria && <Dato etiqueta="Formación complementaria" valor={e.formacion_complementaria} />}
            </section>
          )}

          <section>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#067a0a] border-b-2 border-[#08940c] pb-1 mb-2">Experiencia universitaria</h4>
            {e.experiencias?.length ? (
              <div className="space-y-2">
                {e.experiencias.map((x) => (
                  <div key={x.id} className="border border-[#dfe6e1] border-l-4 border-l-[#08940c] rounded-xl p-3">
                    <p className="font-bold text-[#14201a]">{x.titulo}</p>
                    <p className="text-xs text-[#5f6b64]">{TIPOS[x.tipo] || x.tipo}{x.entidad ? ` · ${x.entidad}` : ''}</p>
                    {x.descripcion && <p className="text-sm text-[#14201a] mt-1">{x.descripcion}</p>}
                    {x.evidencias?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {x.evidencias.map((ev) => (
                          <a key={ev.id} href={urlArchivo(ev.archivo_url)} target="_blank" rel="noreferrer"
                             className="text-xs font-bold text-[#08940c] hover:underline">📎 {ev.nombre_original}</a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#5f6b64]">Sin experiencias registradas.</p>
            )}
          </section>

          <div className="flex flex-wrap justify-end items-center gap-3 pt-4 border-t border-[#dfe6e1]">
            {tieneHvSubida && e.hoja_vida_pdf ? (
              <a href={urlArchivo(e.hoja_vida_pdf)} target="_blank" rel="noreferrer"
                 className="px-4 py-2 rounded-xl text-sm font-semibold text-[#067a0a] bg-[#e8f8ea] hover:bg-[#d5f3d8] border border-[#08940c]/30">
                Ver PDF cargado por el estudiante ↗
              </a>
            ) : (
              <span className="text-xs text-amber-700 font-semibold italic">
                El estudiante aún no ha subido el archivo de su hoja de vida
              </span>
            )}
            <button
              onClick={descargar}
              disabled={descargando || !tieneHvSubida}
              title={!tieneHvSubida ? 'El estudiante no ha subido su hoja de vida' : 'Descargar hoja de vida institucional'}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-[#08940c] hover:bg-[#067a0a] shadow-md shadow-[#08940c]/25 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              {descargando ? 'Generando...' : 'Descargar hoja de vida (PDF)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
