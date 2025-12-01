"use client"

import type React from "react"

import type { AsignacionUI, HistorialItem, ArchivoAdjunto } from "@/types/Asignaciones"
import BarraPrioridad from "../atoms/Barra-prioridad"
import "@/styles/Asignacion_Detalle.css"
import { EquipoIconos } from "../molecules/Equipo-Iconos"
import { useState, useEffect } from "react"
import {
  updateAsignacionEstado,
  enviarAsignacionConArchivos,
  getArchivosDeAsignacion,
} from "@/services/Asignaciones.service"
import { useUser } from "@/context/userContext"
import { useRouter } from "next/navigation"

interface DetalleProps {
  asignacion: AsignacionUI
  historial: HistorialItem[]
  loadingHistorial: boolean
  estilo: string
  onAsignacionActualizada?: () => void
  isCreador?: boolean
}

const generarMensajeHistorial = (item: HistorialItem): string => {
  switch (item.Estado_Nuevo) {
    case "En proceso":
      return "comenzó a trabajar en la tarea."
    case "Enviados":
      return "envió la tarea para revisión."
    case "Aceptada":
      return "revisó y aceptó la tarea."
    case "Correcciones":
      return "rechazó la tarea y solicitó correcciones."
    case "Terminados":
      return "marcó la tarea como terminada."
    default:
      return `cambió el estado a ${item.Estado_Nuevo}.`
  }
}

const formatearFechaHora = (fecha: string): string => {
  const date = new Date(fecha)
  const fechaLocal = date.toLocaleDateString("es-ES")
  const horaLocal = date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  return `${fechaLocal} a las ${horaLocal}`
}

const formatearTamano = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i]
}

const getFileExtension = (filename: string): string => {
  return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toUpperCase()
}

export default function AsignacionDetalle({
  tamaño2,
  tamaño,
  estilo,
  asignacion,
  historial,
  loadingHistorial,
  onAsignacionActualizada,
  isCreador = false,
}: DetalleProps) {
  const { usuario } = useUser()
  const router = useRouter()
  const [cargando, setCargando] = useState(false)
  const [archivosSeleccionados, setArchivosSeleccionados] = useState<File[]>([])
  const [mostrarInputArchivos, setMostrarInputArchivos] = useState(false)
  const [archivosAdjuntos, setArchivosAdjuntos] = useState<ArchivoAdjunto[]>([])
  const [cargandoArchivos, setCargandoArchivos] = useState(false)

  useEffect(() => {
    const cargarArchivos = async () => {
      if (asignacion?.id) {
        setCargandoArchivos(true)
        try {
          const archivos = await getArchivosDeAsignacion(asignacion.id)
          setArchivosAdjuntos(archivos)
        } catch (error) {
          console.error("[v0] Error al cargar archivos:", error)
          setArchivosAdjuntos([])
        } finally {
          setCargandoArchivos(false)
        }
      }
    }
    cargarArchivos()
  }, [asignacion?.id])

  if (!asignacion) {
    return (
      <div className="sin-seleccion">
        <p>No hay asignación para mostrar.</p>
      </div>
    )
  }

  const eventoCreacion = {
    usuario_que_modifico: asignacion?.autor?.nombre || "Usuario desconocido",
    Fecha_Cambio: asignacion?.fecha_inicio || new Date().toISOString(),
    mensaje: "asignó esta tarea.",
  }

  const handleCambioEstado = async (nuevoEstado: string) => {
    if (!usuario?.id) return

    try {
      setCargando(true)
      await updateAsignacionEstado(asignacion.id, usuario.id, nuevoEstado)

      if (onAsignacionActualizada) {
        onAsignacionActualizada()
      }
    } catch (error) {
      console.error("Error al cambiar estado:", error)
      alert("Error al actualizar el estado de la asignación")
    } finally {
      setCargando(false)
    }
  }

  const handleEnviarAsignacion = async () => {
    if (!usuario?.id || archivosSeleccionados.length === 0) {
      alert("Por favor selecciona al menos un archivo")
      return
    }

    try {
      setCargando(true)
      await enviarAsignacionConArchivos(asignacion.id, usuario.id, archivosSeleccionados)

      setArchivosSeleccionados([])
      setMostrarInputArchivos(false)

      if (onAsignacionActualizada) {
        onAsignacionActualizada()
      }

      const archivos = await getArchivosDeAsignacion(asignacion.id)
      setArchivosAdjuntos(archivos)
    } catch (error) {
      console.error("Error al enviar asignación:", error)
      alert("Error al enviar la asignación con archivos")
    } finally {
      setCargando(false)
    }
  }

  const handleArchivosCambiados = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setArchivosSeleccionados(Array.from(e.target.files))
    }
  }

  const handleArchivoClick = (archivo: ArchivoAdjunto) => {
    router.push(`/Archivos/${archivo.ID_Archivo}`)
  }

  const renderBotones = () => {
    if (asignacion.estado === "Asignaciones" && !isCreador) {
      return (
        <button
          onClick={() => handleCambioEstado("En proceso")}
          disabled={cargando}
          className="btn-asignacion btn-comenzar"
        >
          {cargando ? "Procesando..." : "Comenzar"}
        </button>
      )
    }

    if (asignacion.estado === "En proceso" || asignacion.estado === "Correcciones") {
      return (
        <div className="btn-enviar-container">
          {!mostrarInputArchivos ? (
            <button
              onClick={() => setMostrarInputArchivos(true)}
              disabled={cargando}
              className="btn-asignacion btn-preparar-envio"
            >
              {cargando ? "Procesando..." : "Preparar Envío"}
            </button>
          ) : (
            <div className="envio-archivos">
              <input type="file" multiple onChange={handleArchivosCambiados} className="input-archivos" />
              <div className="archivos-seleccionados">
                {archivosSeleccionados.length > 0 && <p>{archivosSeleccionados.length} archivo(s) seleccionado(s)</p>}
              </div>
              <div className="botones-envio">
                <button
                  onClick={handleEnviarAsignacion}
                  disabled={cargando || archivosSeleccionados.length === 0}
                  className="btn-asignacion btn-enviar"
                >
                  {cargando ? "Enviando..." : "Enviar"}
                </button>
                <button
                  onClick={() => {
                    setMostrarInputArchivos(false)
                    setArchivosSeleccionados([])
                  }}
                  disabled={cargando}
                  className="btn-asignacion btn-cancelar"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (asignacion.estado === "Enviados" && isCreador) {
      return (
        <div className="btn-revision-container">
          <button
            onClick={() => handleCambioEstado("Terminados")}
            disabled={cargando}
            className="btn-asignacion btn-aceptar"
          >
            {cargando ? "Procesando..." : "Aceptar"}
          </button>
          <button
            onClick={() => handleCambioEstado("Correcciones")}
            disabled={cargando}
            className="btn-asignacion btn-rechazar"
          >
            {cargando ? "Procesando..." : "Rechazar"}
          </button>
        </div>
      )
    }

    return null
  }

  return (
    <div className="Asignaciones_detalladas" style={{ display: estilo }}>
      <div className="Asignacion_Informacion" style={{ width: `${tamaño}%` }}>
        <div className="Asignacion_Info">
          <h2>{asignacion.titulo}</h2>
          <div className="Asignaciones_detalle_info">
            <div className="Asignaciones_detalle_info1">
              <p>Estado: {asignacion.estado}</p>
              <p>
                Fechas: {asignacion.fecha_inicio} - {asignacion.fecha_termino}
              </p>
              <p>Creador: {asignacion?.autor?.nombre || "Usuario desconocido"}</p>
            </div>
            <div className="Asignaciones_detalle_info2">
              <div className="Asignaciones_detalle_infoA">
                <p>Asignados </p> <EquipoIconos integrantes={asignacion.asignados} />
              </div>
              <div className="Asignaciones_detalle_infoP">
                <p>Prioridad:</p>
                <BarraPrioridad Prioridad={asignacion.prioridad} ancho={"25px"} alto={"25px"} /> {asignacion.prioridad}
              </div>
            </div>
          </div>
        </div>

        <div className="Asignaciones_detalle_descripcion">
          <h3>Descripción</h3>
          <p>{asignacion.descripcion}</p>
        </div>

        {(archivosAdjuntos.length > 0 || cargandoArchivos) && (
          <div className="Asignaciones_archivos_adjuntos">
            <h3>Archivos adjuntos {archivosAdjuntos.length > 0 && `(${archivosAdjuntos.length})`}</h3>
            {cargandoArchivos ? (
              <p>Cargando archivos...</p>
            ) : archivosAdjuntos.length === 0 ? (
              <p>No hay archivos adjuntos</p>
            ) : (
              <div className="archivos_lista">
                {archivosAdjuntos.map((archivo) => (
                  <div
                    key={archivo.ID_Archivo}
                    className="archivo_item"
                    onClick={() => handleArchivoClick(archivo)}
                    title="Click para ver el archivo"
                  >
                    <div className="archivo_icono">
                      <span className="archivo_extension">{getFileExtension(archivo.Nombre_Archivo)}</span>
                    </div>
                    <div className="archivo_info">
                      <p className="archivo_nombre">{archivo.Nombre_Archivo}</p>
                      <p className="archivo_meta">
                        {formatearTamano(archivo.Tamaño_Archivo)} • {archivo.subido_por}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="Asignacion_Acciones">{renderBotones()}</div>
      </div>

      <div className="Asignaciones_Historial" style={{ width: `${tamaño2}%` }}>
        <h3>Actividad</h3>
        {loadingHistorial ? (
          <p>Cargando actividad...</p>
        ) : (
          <ul>
            {historial.map((item) => (
              <li key={item.ID_Historial}>
                {item.usuario_que_modifico} {generarMensajeHistorial(item)}
                <span className="fecha-historial"> — {formatearFechaHora(item.Fecha_Cambio)}</span>
              </li>
            ))}
            <li>
              {eventoCreacion.usuario_que_modifico} {eventoCreacion.mensaje}
              <span className="fecha-historial"> — {formatearFechaHora(eventoCreacion.Fecha_Cambio)}</span>
            </li>
          </ul>
        )}
      </div>
    </div>
  )
}
