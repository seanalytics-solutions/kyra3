"use client"

import type React from "react"

import "@/styles/Icono-Perfil.css"
import { useUserMenu } from "@/context/user-menu-context"

interface IconPerfilProps {
  Imagen?: string
  Nombre: string
  color: string
  userId?: number | string
}

export default function Icono_Perfil({ Imagen, Nombre, color, userId }: IconPerfilProps) {
  const Inicial = (Nombre || "?").charAt(0).toUpperCase()
  const { openUserMenu } = useUserMenu()

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (userId) {
      openUserMenu(Number(userId))
    } else {
    }
  }

  return (
    <button
      onClick={handleClick}
      className="icono-perfil-contenedor"
      style={{
        backgroundColor: Imagen ? "transparent" : color,
        border: "none",
        cursor: userId ? "pointer" : "default",
      }}
      title={Nombre || "Usuario"}
      disabled={!userId}
      type="button"
    >
      {Imagen ? (
        <img
          src={Imagen || "/placeholder.svg"}
          alt={Nombre || "Usuario"}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            pointerEvents: "none",
          }}
        />
      ) : (
        Inicial
      )}
    </button>
  )
}
