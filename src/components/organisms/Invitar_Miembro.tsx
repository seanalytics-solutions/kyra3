"use client"
import { useState, useEffect } from "react"
import { getAllUsers } from "@/services/Usuarios.service"
import type { Usuario } from "@/types/Usuario"
import { addMiembroToEquipo } from "@/services/Equipos.service"

// 1. Actualizamos las props que el modal recibe
interface InvitarMiembroProps {
  onClose: () => void
  onMiembroInvitado: () => void // Callback para notificar al padre
  idEquipo: number
  miembrosActuales: { ID_Usuario: number }[] // Para saber a quién excluir
}

export default function InvitarMiembro({
  onClose,
  onMiembroInvitado,
  idEquipo,
  miembrosActuales,
}: InvitarMiembroProps) {
  const [todosLosUsuarios, setTodosLosUsuarios] = useState<Usuario[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  // 2. Cargamos todos los usuarios del sistema al abrir el modal
  useEffect(() => {
    const fetchUsuarios = async () => {
      setLoading(true)
      const data = await getAllUsers()
      setTodosLosUsuarios(data)
      setLoading(false)
    }
    fetchUsuarios()
  }, [])

  // 3. Filtramos los usuarios: que coincidan con la búsqueda Y que no sean ya miembros
  const idsMiembrosActuales = new Set(miembrosActuales.map((m) => m.ID_Usuario))
  const usuariosFiltrados = todosLosUsuarios.filter(
    (usuario) =>
      usuario &&
      usuario.ID_Usuario &&
      !idsMiembrosActuales.has(usuario.ID_Usuario) &&
      ((usuario.Nombre_Usuario || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (usuario.Correo || "").toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // 4. La función handleInvitar ahora llama a la API
  const handleInvitar = async () => {
    if (!selectedUserId) return
    try {
      await addMiembroToEquipo(idEquipo, selectedUserId)
      alert("¡Usuario invitado con éxito!")
      onMiembroInvitado() // Avisamos al padre para que refresque la lista
      onClose() // Cerramos el modal
    } catch (error: any) {
      console.error("Error al invitar:", error)
      alert(`Error: ${error.message}`)
    }
  }

  return (
    <div className="invitar-miembro-overlay" onClick={onClose}>
      <div className="invitar-miembro-modal" onClick={(e) => e.stopPropagation()}>
        <div className="invitar-miembro-header">
          <h2>Invitar Miembro</h2>
          <button onClick={onClose} className="invitar-miembro-btn-cerrar">
            ×
          </button>
        </div>
        <div className="invitar-miembro-body">
          <input
            type="text"
            placeholder="Buscar usuario por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="invitar-miembro-input-busqueda"
          />
          <div className="invitar-miembro-lista-usuarios">
            {loading ? (
              <p>Cargando usuarios...</p>
            ) : usuariosFiltrados.length > 0 ? (
              usuariosFiltrados.map((usuario) => (
                <div
                  key={usuario.ID_Usuario}
                  className={`invitar-miembro-usuario-item ${selectedUserId === usuario.ID_Usuario ? "selected" : ""}`}
                  onClick={() => setSelectedUserId(usuario.ID_Usuario)}
                >
                  <div>
                    <p className="usuario-nombre">{usuario.Nombre_Usuario}</p>
                    <p className="usuario-email">{usuario.Correo}</p>
                  </div>
                  {selectedUserId === usuario.ID_Usuario && <span className="usuario-check">✓</span>}
                </div>
              ))
            ) : (
              <p className="no-usuarios-encontrados">No se encontraron usuarios o ya son miembros</p>
            )}
          </div>
        </div>
        <div className="invitar-miembro-acciones">
          <button className="invitar-miembro-btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button className="invitar-miembro-btn-enviar" onClick={handleInvitar} disabled={!selectedUserId}>
            Enviar Invitación
          </button>
        </div>
      </div>
    </div>
  )
}
