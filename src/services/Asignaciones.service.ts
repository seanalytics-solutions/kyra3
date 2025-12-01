// src/services/asignaciones.service.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export const getAsignacionesByUsuario = async (idUsuario: number) => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/usuarios/${idUsuario}`)

    if (!response.ok) {
      // Si la respuesta no es OK, no intentes leerla como JSON.
      throw new Error(`Error del servidor: ${response.status} ${response.statusText}`)
    }
    return await response.json()
  } catch (error) {
    console.error("Error al obtener las asignaciones:", error)
    return []
  }
}

import type { ApiAsignacionCreada } from "@/types/Asignaciones"

export const getAsignacionesEnviadasByCreador = async (idUsuario: string | number): Promise<ApiAsignacionCreada[]> => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/${idUsuario}/enviadas`)

    if (!response.ok) {
      throw new Error("Error al obtener las asignaciones enviadas")
    }

    // 1. Guarda el resultado de .json() en una variable
    const data = await response.json()

    // 2. Devuelve la variable, diciéndole a TypeScript que confíe en que es del tipo correcto
    return data as ApiAsignacionCreada[]
  } catch (error) {
    console.error(error)
    // Esta parte está bien, porque un array vacío [] coincide con el tipo ApiAsignacionCreada[]
    return []
  }
}

export const createAsignacion = async (datos: any) => {
  const tieneArchivos = datos.archivos && datos.archivos.length > 0

  if (tieneArchivos) {
    // Si hay archivos, usar FormData
    const formData = new FormData()

    // Agregar campos regulares
    formData.append("Titulo_Asignacion", datos.Titulo_Asignacion)
    formData.append("Descripción_Asignacion", datos.Descripción_Asignacion)
    formData.append("Prioridad", datos.Prioridad)
    formData.append("Fecha_Entrega", datos.Fecha_Entrega)
    formData.append("Creado_Por", datos.Creado_Por)

    if (datos.ID_Proyecto) {
      formData.append("ID_Proyecto", datos.ID_Proyecto)
    }

    // Agregar usuarios como JSON string
    if (datos.usuarios && datos.usuarios.length > 0) {
      formData.append("usuarios", JSON.stringify(datos.usuarios))
    }

    // Agregar archivos
    datos.archivos.forEach((archivo: File) => {
      formData.append("archivos", archivo)
    })

    const response = await fetch(`${API_URL}/asignaciones/`, {
      method: "POST",
      body: formData,
      // No especificar Content-Type, el navegador lo hace automáticamente
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al crear la asignación")
    }

    return await response.json()
  } else {
    // Sin archivos, usar JSON como antes
    const response = await fetch(`${API_URL}/asignaciones/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(datos),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Error al crear la asignación")
    }

    return await response.json()
  }
}

import type { HistorialItem } from "@/types/Asignaciones"

export const getHistorialDeAsignacion = async (idAsignacion: number): Promise<HistorialItem[]> => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/${idAsignacion}/historial`)
    if (!response.ok) {
      throw new Error("Error al obtener el historial de la asignación")
    }
    return await response.json()
  } catch (error) {
    console.error(error)
    return []
  }
}

import type { ApiAsignacionProyecto } from "@/types/Asignaciones"

// Tu backend ya tiene esta ruta: GET /api/asignaciones/proyecto/:ID_Proyecto
export const getAsignacionesByProyecto = async (idProyecto: number | string): Promise<ApiAsignacionProyecto[]> => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/proyecto/${idProyecto}`)
    if (!response.ok) {
      throw new Error("Error al obtener las asignaciones del proyecto")
    }
    return await response.json()
  } catch (error) {
    console.error(error)
    return []
  }
}

export const batchUpdateAsignaciones = async (taskIds: string[], updates: any) => {
  const response = await fetch(`${API_URL}/asignaciones/batch-update`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds, updates }),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Error al actualizar tareas")
  }
  return await response.json()
}

/**
 * Elimina una o más asignaciones en lote.
 */
export const batchDeleteAsignaciones = async (taskIds: string[]) => {
  const response = await fetch(`${API_URL}/asignaciones/batch-delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taskIds }),
  })
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || "Error al eliminar tareas")
  }
  return await response.json()
}

/**
 * Actualiza el estado de una asignación.
 */
export const updateAsignacionEstado = async (idAsignacion: number, idUsuario: number, nuevoEstado: string) => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/${idAsignacion}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ID_Usuario: idUsuario,
        nuevo_estado: nuevoEstado,
      }),
    })

    if (!response.ok) {
      throw new Error("Error al actualizar el estado de la asignación")
    }

    return await response.json()
  } catch (error) {
    console.error("Error actualizando estado:", error)
    throw error
  }
}

// Función para enviar asignación con archivos y actualizar estado a "Enviados"
export const enviarAsignacionConArchivos = async (
  idAsignacion: number,
  idUsuario: number,
  archivos: File[],
): Promise<any> => {
  try {
    const formData = new FormData()
    formData.append("ID_Asignacion", idAsignacion.toString())
    formData.append("ID_Usuario", idUsuario.toString())

    archivos.forEach((archivo) => {
      formData.append("files", archivo)
    })

    const response = await fetch(`${API_URL}/asignaciones/${idAsignacion}/enviar`, {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Error al enviar la asignación con archivos")
    }

    return await response.json()
  } catch (error) {
    console.error("Error enviando asignación:", error)
    throw error
  }
}

export interface ArchivoAdjunto {
  ID_Archivo: number
  Nombre_Archivo: string
  Tamaño_Archivo: number
  Tipo_Archivo: string
  StorageKey: string
  Ruta: string
  Fecha_Subida: string
  subido_por: string
  tipo_adjunto: string
}

export const getArchivosDeAsignacion = async (idAsignacion: number): Promise<ArchivoAdjunto[]> => {
  try {
    const response = await fetch(`${API_URL}/asignaciones/${idAsignacion}/archivos`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] Error del servidor:", errorText)
      throw new Error(`Error al obtener los archivos: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("[v0] Error en getArchivosDeAsignacion:", error)
    return []
  }
}
