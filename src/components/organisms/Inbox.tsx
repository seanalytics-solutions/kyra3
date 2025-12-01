"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useInbox } from "@/context/inbox-context"
import "@/styles/Inbox.css"
import type { Notificacion } from "@/types/Notificaciones"
import { marcarNotificacionComoVista } from "@/services/Notificaciones.service"
import BarraPrioridad from "@/components/atoms/Barra-prioridad"

// Define the props the component receives
interface InboxProps {
  initialNotifications: Notificacion[]
}

export default function Inbox({ initialNotifications }: InboxProps) {
  const { isOpen, closeInbox } = useInbox()
  const router = useRouter()
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(initialNotifications)

  useEffect(() => {
    setNotificaciones(initialNotifications)
  }, [initialNotifications])

  // Function to handle marking a notification as read
  const handleMarkAsRead = async (idNotificacion: number) => {
    try {
      // Call the API to update the status in the database
      await marcarNotificacionComoVista(idNotificacion)

      // Update the local state to reflect the change instantly in the UI
      setNotificaciones(
        notificaciones.map((noti) => (noti.ID_Notificacion === idNotificacion ? { ...noti, Visto: true } : noti)),
      )
    } catch (error) {
      console.error("Error al marcar como leído:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      const unreadNotifications = notificaciones.filter((noti) => !noti.Visto)
      await Promise.all(unreadNotifications.map((noti) => marcarNotificacionComoVista(noti.ID_Notificacion)))
      // Mark all as read in the UI
      setNotificaciones(notificaciones.map((noti) => ({ ...noti, Visto: true })))
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error)
    }
  }

  const handleNotificationClick = async (noti: Notificacion) => {
    try {
      if (!noti.Visto) {
        await handleMarkAsRead(noti.ID_Notificacion)
      }

      // Navigate based on notification type
      const tipo = noti.Tipo_Noti?.toLowerCase() || ""
      const detalles = noti.Detalles || {}

      if (tipo.includes("mensaje") || tipo.includes("chat")) {
        router.push("/Chats")
      } else if (tipo.includes("asignacion") || tipo.includes("asignación")) {
        // Try to extract assignment ID from various possible fields
        const asignacionId =
          detalles.ID_Asignacion ||
          detalles.idAsignacion ||
          detalles.id_asignacion ||
          detalles.asignacionId ||
          detalles.id

        const message = detalles.message?.toLowerCase() || ""
        const esRevision = message.includes("revisión") || message.includes("revision") || message.includes("review")

        if (esRevision) {
          if (asignacionId) {
            router.push(`/Asignados?id=${asignacionId}`)
          } else {
            router.push("/Asignados")
          }
        } else {
          if (asignacionId) {
            router.push(`/Asignaciones?id=${asignacionId}`)
          } else {
            router.push("/Asignaciones")
          }
        }
      } else if (tipo.includes("revisión") || tipo.includes("revision")) {
        const asignacionId =
          detalles.ID_Asignacion ||
          detalles.idAsignacion ||
          detalles.id_asignacion ||
          detalles.asignacionId ||
          detalles.id
        if (asignacionId) {
          router.push(`/Asignados?id=${asignacionId}`)
        } else {
          router.push("/Asignados")
        }
      } else {
        if (detalles.routeTo) {
          router.push(detalles.routeTo)
        }
      }

      closeInbox()
    } catch (error) {
      console.error("[v0] Error al procesar notificación:", error)
    }
  }

  const unreadCount = notificaciones.filter((noti) => !noti.Visto).length

  return (
    <>
      {isOpen && <div className="inbox-overlay" onClick={closeInbox} aria-hidden="true" />}

      <div className={`Inbox_Contenedor ${isOpen ? "inbox-open" : ""}`}>
        <div className="Inbox_Header">
          <h2 className="Inbox_Titulo">
            Notificaciones {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
          </h2>
          <button className="Inbox_Cerrar" onClick={closeInbox} aria-label="Cerrar inbox">
            ×
          </button>
        </div>

        {unreadCount > 0 && (
          <div className="Inbox_Actions">
            <button className="mark-all-btn" onClick={handleMarkAllAsRead} aria-label="Marcar todas como vistas">
              Marcar todas como vistas
            </button>
          </div>
        )}

        <div className="Inbox_Lista">
          {isOpen && notificaciones.length > 0
            ? notificaciones.map((noti) => {
                const detalles = noti.Detalles || {}
                const tipo = noti.Tipo_Noti?.toLowerCase() || ""
                const esAsignacion = tipo.includes("asignacion") || tipo.includes("asignación")
                const nombreAsignacion = detalles.nombreAsignacion || detalles.titulo || detalles.Titulo_Asignacion
                const prioridad = detalles.prioridad || detalles.Prioridad

                return (
                  <div
                    key={noti.ID_Notificacion}
                    className={`Notificacion ${!noti.Visto ? "notificacion-no-leida" : ""}`}
                    onClick={() => handleNotificationClick(noti)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="Notificacion_Content">
                      {esAsignacion && (nombreAsignacion || prioridad) ? (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                            <h3 className="Notificacion_Titulo">{noti.Tipo_Noti}</h3>
                            {prioridad && <BarraPrioridad prioridad={prioridad} ancho="20px" alto="20px" />}
                          </div>
                          {nombreAsignacion && (
                            <p className="Notificacion_Mensaje" style={{ fontWeight: 600, marginBottom: "4px" }}>
                              {nombreAsignacion}
                            </p>
                          )}
                          <p className="Notificacion_Mensaje">{detalles.message || "Nueva actividad"}</p>
                        </>
                      ) : (
                        <>
                          <h3 className="Notificacion_Titulo">{noti.Tipo_Noti}</h3>
                          <p className="Notificacion_Mensaje">{detalles.message || "Nueva actividad"}</p>
                        </>
                      )}
                      <span className="Notificacion_Fecha">{new Date(noti.Fecha).toLocaleDateString()}</span>
                    </div>
                    {!noti.Visto && (
                      <button
                        className="mark-as-read-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleMarkAsRead(noti.ID_Notificacion)
                        }}
                        aria-label="Marcar como leída"
                        title="Marcar como leída"
                      >
                        ✓
                      </button>
                    )}
                  </div>
                )
              })
            : isOpen && (
                <div className="Inbox_Vacio">
                  <p>No tienes notificaciones</p>
                </div>
              )}
        </div>
      </div>
    </>
  )
}
