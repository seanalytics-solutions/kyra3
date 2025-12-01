"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSocket } from "@/hooks/useSocket"
import type { Mensaje } from "@/types/Chats"
import Icono_Perfil from "../atoms/Icono-Perfil"
import "@/styles/Chat-Mensajes.css"

interface ChatMensajesProps {
  conversacionId: string
  participante: {
    id: string
    nombre: string
    color: string
  }
  usuarioActualId: string
  usuarioActualNombre: string
  onMensajeEnviado?: (conversacionId: string, contenido: string, timestamp: string) => void
}

export default function ChatMensajes({
  conversacionId,
  participante,
  usuarioActualId,
  usuarioActualNombre,
  onMensajeEnviado,
}: ChatMensajesProps) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [mensajeNuevo, setMensajeNuevo] = useState("")
  const [escribiendo, setEscribiendo] = useState(false)
  const [usuarioEscribiendo, setUsuarioEscribiendo] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const esGrupo = !participante.id || participante.id === "null" || participante.id === "undefined"

  const handleMessageReceive = useCallback(
    (mensaje: Mensaje) => {
      if (mensaje.conversacionId === conversacionId) {
        setMensajes((prev) => [...prev, mensaje])
        scrollAlFinal()
      }
    },
    [conversacionId],
  )

  const handleUserTyping = useCallback(
    (data) => {
      if (data.receptorId === usuarioActualId && data.emisorId === participante.id) {
        setUsuarioEscribiendo(data.escribiendo ? participante.nombre : null)
      }
    },
    [usuarioActualId, participante.id, participante.nombre],
  )

  const { socket, enviarMensajeDirecto, indicarEscrituraEnCurso, isReady } = useSocket({
    userId: usuarioActualId,
    onMessageReceive: handleMessageReceive,
    onUserTyping: handleUserTyping,
  })

  useEffect(() => {
    const cargarMensajes = async () => {
      try {
        setMensajes([])
        setUsuarioEscribiendo(null)

        const respuesta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/mensajes/${conversacionId}`,
        )
        if (respuesta.ok) {
          const data = await respuesta.json()
          setMensajes(data)
          scrollAlFinal()
        } else {
          console.error("Error response:", respuesta.status)
          const errorText = await respuesta.text()
          console.error("Error text:", errorText)
        }
      } catch (error) {
        console.error("Error al cargar mensajes:", error)
      }
    }

    if (conversacionId) {
      cargarMensajes()
    }

    return () => {
      setMensajes([])
      setUsuarioEscribiendo(null)
    }
  }, [conversacionId])

  const scrollAlFinal = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }, 0)
  }

  const manejarCambioInput = (texto: string) => {
    setMensajeNuevo(texto)

    if (!escribiendo && texto.length > 0) {
      setEscribiendo(true)
      if (!esGrupo) {
        indicarEscrituraEnCurso(participante.id, true)
      }
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (escribiendo) {
        setEscribiendo(false)
        if (!esGrupo) {
          indicarEscrituraEnCurso(participante.id, false)
        }
      }
    }, 1000)
  }

  const manejarEnvioMensaje = async () => {
    if (!mensajeNuevo.trim() || !isReady) return

    const mensajeContenido = mensajeNuevo

    const conversacionIdInt = Number.parseInt(conversacionId, 10)
    const emisorIdInt = Number.parseInt(usuarioActualId, 10)

    const receptorIdInt = esGrupo ? null : Number.parseInt(participante.id, 10)

    const timestamp = new Date().toISOString()

    const nuevoMensaje: Mensaje = {
      id: "",
      conversacionId,
      emisorId: usuarioActualId,
      emisorNombre: usuarioActualNombre,
      receptorId: esGrupo ? "" : participante.id,
      contenido: mensajeContenido,
      timestamp: timestamp,
      leido: false,
    }

    setMensajes((prev) => [...prev, nuevoMensaje])
    setMensajeNuevo("")
    setEscribiendo(false)

    scrollAlFinal()

    if (!esGrupo) {
      enviarMensajeDirecto(participante.id, mensajeContenido, conversacionId)
    }

    try {
      const requestBody: any = {
        conversacionId: conversacionIdInt,
        emisorId: emisorIdInt,
        contenido: mensajeContenido,
      }

      if (!esGrupo && receptorIdInt) {
        requestBody.receptorId = receptorIdInt
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"}/mensajes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("[v0] Error saving message. Status:", response.status, "Body:", errorText)
        setMensajes((prev) => prev.slice(0, -1))
      } else {
        const guardado = await response.json()
        setMensajes((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            ...updated[updated.length - 1],
            id: guardado.id.toString(),
          }
          return updated
        })

        if (onMensajeEnviado) {
          onMensajeEnviado(conversacionId, mensajeContenido, timestamp)
        }
      }
    } catch (error) {
      console.error("Error al guardar mensaje:", error)
      setMensajes((prev) => prev.slice(0, -1))
    }
  }

  const formatearHora = (fechaISO: string) => {
    return new Date(fechaISO).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="Chat_Mensajes_Contenedor">
      <div className="Chat_Encabezado">
        <div className="Chat_Participante_Info">
          <Icono_Perfil Nombre={participante.nombre} color={participante.color} userId={participante.id} />
          <div className="Chat_Participante_Detalles">
            <h3>{participante.nombre}</h3>
            {usuarioEscribiendo && <p className="Escribiendo_Indicador">{usuarioEscribiendo} está escribiendo...</p>}
          </div>
        </div>
      </div>

      <div className="Chat_Area_Mensajes">
        {mensajes.length === 0 ? (
          <div className="Sin_Mensajes">
            <p>No hay mensajes aún. ¡Inicia la conversación!</p>
          </div>
        ) : (
          mensajes.map((mensaje) => {
            const mensajeEmisorId = String(mensaje.emisorId)
            const usuarioId = String(usuarioActualId)
            const esMensajeEnviado = mensajeEmisorId === usuarioId

            return (
              <div key={mensaje.id} className={`Mensaje ${esMensajeEnviado ? "Enviado" : "Recibido"}`}>
                {!esMensajeEnviado && (
                  <Icono_Perfil Nombre={mensaje.emisorNombre} color={participante.color} userId={mensaje.emisorId} />
                )}
                <div className="Mensaje_Contenedor">
                  <div className="Mensaje_Burbuja">{mensaje.contenido}</div>
                  <span className="Mensaje_Hora">{formatearHora(mensaje.timestamp)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="Chat_Input_Contenedor">
        <input
          type="text"
          placeholder="Escribe un mensaje..."
          className="Chat_Input"
          value={mensajeNuevo}
          onChange={(e) => manejarCambioInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              manejarEnvioMensaje()
            }
          }}
          disabled={!isReady}
        />
        <button className="Chat_Enviar_Btn" onClick={manejarEnvioMensaje} disabled={!mensajeNuevo.trim() || !isReady}>
          Enviar
        </button>
      </div>
    </div>
  )
}
