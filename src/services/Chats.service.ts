const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

export const buscarUsuariosDisponibles = async (usuarioActualId: string, terminoBusqueda: string) => {
  try {
    const response = await fetch(
      `${API_URL}/usuarios?search=${encodeURIComponent(terminoBusqueda)}&exclude=${usuarioActualId}`,
    )
    if (!response.ok) throw new Error("Error al buscar usuarios")
    return await response.json()
  } catch (error) {
    console.error("Error al buscar usuarios:", error)
    return []
  }
}
 
export const crearConversacion = async (usuarioActualId: string, participanteId: string) => {
  try {
    const response = await fetch(`${API_URL}/conversaciones`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        usuario1Id: usuarioActualId,
        usuario2Id: participanteId,
      }),
    })
    if (!response.ok) throw new Error("Error al crear conversación")
    return await response.json()
  } catch (error) {
    console.error("Error al crear conversación:", error)
    throw error
  }
}

export const obtenerConversaciones = async (usuarioId: string) => {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"

    const response = await fetch(`${apiUrl}/conversaciones/usuario/${usuarioId}`)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Error al obtener conversaciones. Status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error("Error al obtener conversaciones:", error)
    throw error
  }
}

export const crearConversacionGrupo = async (nombreGrupo: string, idEquipo: number, miembrosIds: number[]) => {
  try {
    const response = await fetch(`${API_URL}/conversaciones-grupo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreGrupo,
        idEquipo,
        miembrosIds,
      }),
    })
    if (!response.ok) throw new Error("Error al crear conversación de grupo")
    return await response.json()
  } catch (error) {
    console.error("Error al crear conversación de grupo:", error)
    throw error
  }
}

export const obtenerConversacionGrupo = async (idEquipo: number) => {
  try {
    const response = await fetch(`${API_URL}/conversaciones/grupo/equipo/${idEquipo}`)
    if (!response.ok) throw new Error("Error al obtener conversación de grupo")
    return await response.json()
  } catch (error) {
    console.error("Error al obtener conversación de grupo:", error)
    return null
  }
}
