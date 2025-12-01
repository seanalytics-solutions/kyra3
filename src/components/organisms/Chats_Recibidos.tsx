"use client"

import { useState, useEffect } from "react"
import type { Conversacion, Participante } from "@/types/Chats"
import Icono_Perfil from "../atoms/Icono-Perfil"
import { buscarUsuariosDisponibles } from "@/services/Chats.service"

interface ChatsRecibidosProps {
  conversaciones: Conversacion[]
  chatSeleccionadoId: string | null
  onSeleccionarConversacion: (id: string) => void
  valorBusqueda: string
  onBusquedaChange: (valor: string) => void
  usuarioActualId: string
  onNuevaConversacion: (participante: Participante) => void
}

export default function ChatsRecibidos({
  conversaciones,
  chatSeleccionadoId,
  onSeleccionarConversacion,
  valorBusqueda,
  onBusquedaChange,
  usuarioActualId,
  onNuevaConversacion,
}: ChatsRecibidosProps) {
  const [usuariosDisponibles, setUsuariosDisponibles] = useState<Participante[]>([])
  const [mostrando, setMostrando] = useState<"conversaciones" | "usuarios">("conversaciones")

  useEffect(() => {
    conversaciones.forEach((conv) => {
    })
  }, [conversaciones])

  useEffect(() => {
    const buscar = async () => {
      if (valorBusqueda.trim().length > 0) {
        const usuarios = await buscarUsuariosDisponibles(usuarioActualId, valorBusqueda)
        const usuariosConversacionExistente = usuarios.filter(
          (u: any) => !conversaciones.some((c) => c.participante.id === u.id),
        )
        setUsuariosDisponibles(usuariosConversacionExistente)
        setMostrando("usuarios")
      } else {
        setUsuariosDisponibles([])
        setMostrando("conversaciones")
      }
    }

    buscar()
  }, [valorBusqueda, usuarioActualId, conversaciones])

  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO)
    return fecha.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleSeleccionarUsuario = (usuario: any) => {
    const participante: Participante = {
      id: usuario.id,
      nombre: usuario.nombre,
      color: usuario.color || "#000",
    }
    onNuevaConversacion(participante)
    onBusquedaChange("")
  }

  return (
    <div className="Mensajes_Recibidos">
      <div className="Mensajes_Recibidos_Titulo">Chats</div>

      <div className="Input_Busqueda_Contenedor">
        <input
          type="text"
          placeholder="Buscar o empezar una nueva conversación"
          className="Input_Busqueda"
          value={valorBusqueda}
          onChange={(e) => onBusquedaChange(e.target.value)}
        />
      </div>

      <div className="Mensajes_Lista">
        {mostrando === "usuarios" ? (
          <>
            {usuariosDisponibles.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                <p>No se encontraron usuarios</p>
              </div>
            ) : (
              <>
                <div style={{ padding: "10px 20px", fontSize: "12px", color: "#999", fontWeight: "bold" }}>
                  USUARIOS DISPONIBLES
                </div>
                {usuariosDisponibles
                  .filter((u: any) => u.id)
                  .map((usuario: any) => (
                    <div
                      key={`usuario-${usuario.id}`}
                      className="Chat_Item"
                      onClick={() => handleSeleccionarUsuario(usuario)}
                      style={{ cursor: "pointer" }}
                    >
                      <div className="Mensaje_Autor">
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                          <Icono_Perfil
                            Nombre={usuario.nombre || "Usuario"}
                            color={usuario.color || "#000"}
                            userId={usuario.id}
                          />
                          <span className="Autor_Nombre">{usuario.nombre || "Usuario"}</span>
                        </div>
                      </div>
                      <div className="Mensaje_Contenido">
                        <p className="Mensaje_Texto" style={{ color: "#999" }}>
                          Iniciar conversación
                        </p>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </>
        ) : (
          <>
            {conversaciones.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                <p>No tienes ningún chat</p>
              </div>
            ) : (
              <>
                {conversaciones.map((chat) => (
                  <div
                    key={chat.id}
                    className={`Chat_Item ${chatSeleccionadoId === chat.id ? "seleccionada" : ""}`}
                    onClick={() => onSeleccionarConversacion(chat.id)}
                  >
                    <div className="Mensaje_Autor">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                        <Icono_Perfil
                          Nombre={chat.participante.nombre}
                          color={chat.participante.color}
                          userId={chat.participante.id}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                          <span className="Autor_Nombre">{chat.participante.nombre}</span>
                          {chat.esGrupo && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <svg
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{
                                  color: "#E47A6E",
                                  flexShrink: 0,
                                }}
                              >
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                              </svg>
                              <span
                                style={{
                                  fontSize: "11px",
                                  color: "#E47A6E",
                                  fontWeight: "600",
                                  backgroundColor: "rgba(228, 122, 110, 0.1)",
                                  padding: "2px 6px",
                                  borderRadius: "12px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Grupal
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="Mensaje_Contenido">
                      <p className="Mensaje_Texto">{chat.ultimoMensaje}</p>
                      <span className="Mensaje_Fecha">{formatearFecha(chat.timestamp)}</span>
                    </div>
                  </div>
                ))}
                <div
                  style={{
                    padding: "20px",
                    textAlign: "center",
                    color: "#999",
                    fontSize: "12px",
                    borderTop: "1px solid #eee",
                  }}
                >
                  <p>Son todos tus chats</p>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
