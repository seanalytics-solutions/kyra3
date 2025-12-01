"use client"

import React from "react"
import { useUser } from "@/context/userContext"
import { getNotificacionesByUsuario } from "@/services/Notificaciones.service"
import type { Notificacion } from "@/types/Notificaciones"
import { ProtectedRoute } from "./ProtectedRoute"

export const NotificationsWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { usuario } = useUser()
  const [initialNotifications, setInitialNotifications] = React.useState<Notificacion[]>([])

  React.useEffect(() => {
    if (usuario) {
      getNotificacionesByUsuario(usuario.id).then(setInitialNotifications)
    }
  }, [usuario])

  return <ProtectedRoute notifications={initialNotifications}>{children}</ProtectedRoute>
}
 