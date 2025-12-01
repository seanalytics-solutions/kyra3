"use client"

import { useState, useEffect } from "react"
import { useUserMenu } from "@/context/user-menu-context"
import { useUser } from "@/context/userContext"
import ThemeToggle from "@/components/atoms/ThemeToggle"
import "@/styles/UserMenu.css"
import { getEquiposByUsuario, addMiembroToEquipo, getMiembrosDeEquipo } from "@/services/Equipos.service"
import type { Equipo, MiembroEquipo } from "@/types/Equipos"

export default function UserMenu() {
  const { isOpen, selectedUser, closeUserMenu, isLoading } = useUserMenu()
  const { usuario, logout } = useUser()
  const [isDark, setIsDark] = useState(false)
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [showTeamDropdown, setShowTeamDropdown] = useState(false)
  const [inviteMessage, setInviteMessage] = useState<string>("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  const isCurrentUser = !selectedUser || selectedUser.ID_Usuario === usuario?.id
  const displayUser = isCurrentUser ? usuario : selectedUser

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = savedTheme === "dark"
    setIsDark(prefersDark)
  }, [])

  useEffect(() => {
    if (isOpen && !isCurrentUser && usuario?.id) {
      loadUserTeams()
    }
  }, [isOpen, isCurrentUser, usuario?.id])

  const loadUserTeams = async () => {
    if (!usuario?.id) return
    try {
      const userTeams = await getEquiposByUsuario(usuario.id)
      setEquipos(userTeams)
    } catch (error) {
      console.error("Error loading teams:", error)
    }
  }

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)

    if (newTheme) {
      document.documentElement.classList.add("dark-theme")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark-theme")
      localStorage.setItem("theme", "light")
    }
  }

  const canInviteToTeams = () => {
    if (!usuario?.rol) return false
    // Roles: 3 = Líder de proyecto, 4 = Sublider de equipo
    return usuario.rol === 3 || usuario.rol === 4
  }

  const handleInviteToTeam = async (idEquipo: number, nombreEquipo: string) => {
    if (!selectedUser || !usuario) return

    // Check if user has permission
    if (!canInviteToTeams()) {
      setInviteMessage("No tienes autorizacion de equipo")
      setMessageType("error")
      setTimeout(() => {
        setInviteMessage("")
        setMessageType("")
      }, 3000)
      return
    }

    try {
      // First, check if the user is already a member
      const miembros = await getMiembrosDeEquipo(idEquipo)
      const isAlreadyMember = miembros.some((m: MiembroEquipo) => m.ID_Usuario === selectedUser.ID_Usuario)

      if (isAlreadyMember) {
        setInviteMessage(`${selectedUser.Nombre_Usuario} ya pertenece al equipo`)
        setMessageType("error")
        setTimeout(() => {
          setInviteMessage("")
          setMessageType("")
        }, 3000)
        return
      }

      // Add the user to the team
      await addMiembroToEquipo(idEquipo, selectedUser.ID_Usuario)
      setInviteMessage(`${selectedUser.Nombre_Usuario} fue invitado a ${nombreEquipo}`)
      setMessageType("success")
      setTimeout(() => {
        setInviteMessage("")
        setMessageType("")
        setShowTeamDropdown(false)
      }, 3000)
    } catch (error: any) {
      setInviteMessage(error.message || "Error al invitar al usuario")
      setMessageType("error")
      setTimeout(() => {
        setInviteMessage("")
        setMessageType("")
      }, 3000)
    }
  }

  const handleSendMessage = () => {
    // TODO: Implement send message functionality
  }

  const getInitials = (name?: string) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {isOpen && <div className="user-menu-overlay" onClick={closeUserMenu} aria-hidden="true" />}

      <div className={`UserMenu_Contenedor ${isOpen ? "user-menu-open" : ""}`}>
        <div className="UserMenu_Header">
          {isCurrentUser && <ThemeToggle isDark={isDark} onToggle={toggleTheme} />}
          <button className="UserMenu_Cerrar" onClick={closeUserMenu} aria-label="Cerrar menú">
            ×
          </button>
        </div>

        <div className="UserMenu_Content">
          {isLoading ? (
            <div className="UserMenu_Loading">Cargando...</div>
          ) : (
            <>
              {/* User Avatar */}
              <div className="UserMenu_Avatar" style={{ backgroundColor: displayUser?.color || "#8B5A5A" }}>
                {getInitials(displayUser?.nombre || displayUser?.Nombre_Usuario)}
              </div>

              {/* User Info */}
              <h2 className="UserMenu_Name">{displayUser?.nombre || displayUser?.Nombre_Usuario || "Usuario"}</h2>
              <p className="UserMenu_Role">{displayUser?.rol_nombre || displayUser?.Rol_Nombre || "Usuario"}</p>
              <p className="UserMenu_Email">{displayUser?.email || displayUser?.Email || ""}</p>

              {/* Actions */}
              <div className="UserMenu_Actions">
                {isCurrentUser ? (
                  <>
                    <button onClick={logout} className="UserMenu_Button UserMenu_Button--logout">
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleSendMessage} className="UserMenu_Button UserMenu_Button--primary">
                      Enviar mensaje
                    </button>

                    <div className="UserMenu_InviteContainer">
                      <button
                        onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                        className="UserMenu_Button UserMenu_Button--secondary"
                      >
                        Invitar a equipo {showTeamDropdown ? "▲" : "▼"}
                      </button>

                      {showTeamDropdown && (
                        <div className="UserMenu_TeamDropdown">
                          {equipos.length === 0 ? (
                            <div className="UserMenu_TeamItem UserMenu_TeamItem--empty">No tienes equipos</div>
                          ) : (
                            equipos.map((equipo) => (
                              <div key={equipo.ID_Equipo} className="UserMenu_TeamItem">
                                <span>{equipo.Nombre_Equipo}</span>
                                <button
                                  onClick={() => handleInviteToTeam(equipo.ID_Equipo, equipo.Nombre_Equipo)}
                                  className="UserMenu_InviteButton"
                                >
                                  Invitar
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {inviteMessage && (
                      <div className={`UserMenu_Message UserMenu_Message--${messageType}`}>{inviteMessage}</div>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
