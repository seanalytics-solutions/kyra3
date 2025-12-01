"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import "../../styles/Archivo.css"
import ModalCompartir from "../organisms/Compartir_Archivo"
import type { ArchivoEquipo } from "@/types/Equipos"
import { addFavorito, downloadArchivo, deleteArchivo, updateArchivoNombre } from "@/services/Archivos.service"
import { Console } from "console"

interface ArchivoProps {
  archivoData?: ArchivoEquipo | null
}

export default function Archivo({ archivoData }: ArchivoProps) {
  const router = useRouter()
  const [mostrarModal, setMostrarModal] = useState(false)
  const [mostrarModalRenombrar, setMostrarModalRenombrar] = useState(false)
  const [isFavorite, setIsFavorite] = useState(archivoData?.is_favorito ?? false)
  const [nombreArchivo, setNombreArchivo] = useState(archivoData?.Nombre_Archivo || "")
  const [nuevoNombre, setNuevoNombre] = useState("")

  const archivo: ArchivoEquipo = archivoData
    ? {
        ID_Archivo: archivoData.ID_Archivo,
        Nombre_Archivo: nombreArchivo,
        Tamaño_Archivo: archivoData.Tamaño_Archivo,
        Fecha_Subida: archivoData.Fecha_Subida,
        propietario: archivoData.propietario || "Desconocido",
        estado: archivoData.estado || "No asignado",
        StorageKey: archivoData.StorageKey,
        is_favorito: isFavorite,
      }
    : {
        ID_Archivo: 0,
        Nombre_Archivo: "Archivo no encontrado",
        Tamaño_Archivo: 0,
        Fecha_Subida: new Date().toISOString(),
        propietario: "Desconocido",
        estado: "No asignado",
        StorageKey: "",
        is_favorito: false,
      }

  const handleToggleFavorito = async () => {
    if (!archivoData) return
    try {
      const userId = localStorage.getItem("userID") ? Number(localStorage.getItem("userID")) : 1
      await addFavorito(userId, archivoData.ID_Archivo)
      setIsFavorite(!isFavorite)
    } catch (error) {
      console.error("Error al togglear favorito:", error)
      alert("No se pudo actualizar el estado de favorito.")
    }
  }

  const handleDownload = async () => {
    if (!archivoData) return
    try {
      await downloadArchivo(archivoData.ID_Archivo, archivoData.Nombre_Archivo)
    } catch (error) {
      console.error("Error al descargar archivo:", error)
      alert("No se pudo descargar el archivo.")
    }
  }

  const handleRename = () => {
    const extension = getFileExtension(nombreArchivo)
    const nameWithoutExt = extension ? nombreArchivo.slice(0, -(extension.length + 1)) : nombreArchivo
    setNuevoNombre(nameWithoutExt)
    setMostrarModalRenombrar(true)
  }

  const confirmarRenombrar = async () => {
    if (!archivoData || !nuevoNombre || nuevoNombre.trim() === "") {
      setMostrarModalRenombrar(false)
      return
    }

    const extension = getFileExtension(nombreArchivo)
    const nombreConExtension =
      extension && !nuevoNombre.endsWith(`.${extension}`) ? `${nuevoNombre}.${extension}` : nuevoNombre

    if (nombreConExtension === nombreArchivo) {
      setMostrarModalRenombrar(false)
      return
    }

    try {
      await updateArchivoNombre(archivoData.ID_Archivo, nombreConExtension)
      setNombreArchivo(nombreConExtension)
      setMostrarModalRenombrar(false)
      alert("Archivo renombrado con éxito.")
    } catch (error) {
      console.error("Error al renombrar:", error)
      alert("No se pudo renombrar el archivo.")
    }
  }

  const handleDelete = async () => {
    if (!archivoData) return
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${nombreArchivo}"?`)) {
      try {
        await deleteArchivo(archivoData.ID_Archivo)
        alert("Archivo eliminado con éxito.")
        router.back()
      } catch (error) {
        console.error("Error al eliminar archivo:", error)
        alert("No se pudo eliminar el archivo.")
      }
    }
  }

  const getFileExtension = (filename: string): string => {
    return filename.slice(((filename.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase()
  }

  const isImage = (filename: string): boolean => {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"]
    return imageExtensions.includes(getFileExtension(filename))
  }

  const isPDF = (filename: string): boolean => {
    return getFileExtension(filename) === "pdf"
  }

  const isDocx = (filename: string): boolean => {
    return getFileExtension(filename) === "docx"
  }

  const isDoc = (filename: string): boolean => {
    return getFileExtension(filename) === "doc"
  }

  const getFileUrl = (): string => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"
    const baseURL = API_URL.replace(/\/api$/, "")
    return `${baseURL}/${archivoData?.StorageKey || ""}`
  }

  const getDocxViewerUrl = (): string => {
    const fileUrl = getFileUrl()
    return `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
  }

  const formatearTamano = (bytes: number): string => {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`
  }

  const formatearFecha = (fecha: string): string => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <div className="Archivo_Contenedor">
      <div className="Archivo_Info_Panel">
        <div className="Archivo_Info_Header">
          <h1 className="Archivo_Nombre">{archivo.Nombre_Archivo}</h1>
          <button className="Archivo_Cerrar" onClick={() => router.back()}>
            ×
          </button>
        </div>

        {/* Meta info section */}
        <div className="Archivo_Meta">
          <span className="Archivo_Tamano">{formatearTamano(archivo.Tamaño_Archivo)}</span>
          <span className="Archivo_Fecha">{formatearFecha(archivo.Fecha_Subida)}</span>
        </div>

        {/* Action buttons - horizontal layout */}
        <div className="Archivo_Acciones">
          <button onClick={handleRename} className="Archivo_Accion_Btn" title="Renombrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
            </svg>
          </button>
          <button onClick={handleDownload} className="Archivo_Accion_Btn" title="Descargar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
          <button onClick={handleDelete} className="Archivo_Accion_Btn Archivo_Accion_Eliminar" title="Eliminar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 0-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
          <button
            onClick={handleToggleFavorito}
            className={`Archivo_Accion_Btn ${isFavorite ? "Archivo_Favorito_Activo" : ""}`}
            title={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill={isFavorite ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="Archivo_Divider" />

        {/* Owner section */}
        <div className="Archivo_Seccion">
          <h3 className="Archivo_Seccion_Titulo">PROPIETARIO</h3>
          <div className="Archivo_Propietario">
            <div className="Archivo_Avatar">{archivo.propietario.charAt(0).toUpperCase()}</div>
            <div className="Archivo_Propietario_Info">
              <div className="Archivo_Propietario_Nombre">{archivo.propietario}</div>
              <div className="Archivo_Estado_Badge">{archivo.estado}</div>
            </div>
          </div>
        </div>
        <div className="Archivo_Divider" />
      </div>

      <div className="Archivo_Visor">
        {archivoData && isImage(archivo.Nombre_Archivo) ? (
          <img src={getFileUrl() || "/placeholder.svg"} alt={archivo.Nombre_Archivo} className="Archivo_Imagen" />
        ) : archivoData && isPDF(archivo.Nombre_Archivo) ? (
          <iframe src={getFileUrl()} title={archivo.Nombre_Archivo} className="Archivo_PDF" />
        ) : archivoData && (isDocx(archivo.Nombre_Archivo) || isDoc(archivo.Nombre_Archivo)) ? (
          <div className="Archivo_NoPreview Archivo_DocxPreview">
            <div className="Archivo_DocxIcon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <p className="Archivo_FileType">Documento de Word</p>
            <p className="Archivo_FileName">{archivo.Nombre_Archivo}</p>
            <p className="Archivo_PreviewText">
              Los documentos de Word (.docx) no se pueden visualizar directamente en el navegador.
            </p>
            <button onClick={handleDownload} className="Archivo_DownloadButton">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Descargar documento
            </button>
          </div>
        ) : (
          <div className="Archivo_NoPreview">
            <p className="Archivo_FileType">{getFileExtension(archivo.Nombre_Archivo).toUpperCase()}</p>
            <p>Vista previa no disponible para este tipo de archivo</p>
            <button onClick={handleDownload} className="Archivo_DownloadButton">
              Descargar para ver
            </button>
          </div>
        )}
      </div>

      {/* Modal de renombrar */}
      {mostrarModalRenombrar && (
        <div className="Archivo_Modal_Overlay" onClick={() => setMostrarModalRenombrar(false)}>
          <div className="Archivo_Modal" onClick={(e) => e.stopPropagation()}>
            <div className="Archivo_Modal_Header">
              <h2>Renombrar archivo</h2>
              <button onClick={() => setMostrarModalRenombrar(false)} className="Archivo_Modal_Cerrar">
                ×
              </button>
            </div>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="Archivo_Modal_Input"
              placeholder="Nuevo nombre"
            />
            <p className="Archivo_Modal_Hint">
              La extensión .{getFileExtension(nombreArchivo)} se agregará automáticamente
            </p>
            <div className="Archivo_Modal_Acciones">
              <button
                onClick={() => setMostrarModalRenombrar(false)}
                className="Archivo_Modal_Btn Archivo_Modal_Btn_Cancelar"
              >
                Cancelar
              </button>
              <button onClick={confirmarRenombrar} className="Archivo_Modal_Btn Archivo_Modal_Btn_Confirmar">
                Renombrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
