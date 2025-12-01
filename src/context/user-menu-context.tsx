"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { Usuario } from "@/types/Usuario"
import { getUserById } from "@/services/Usuarios.service"

interface UserMenuContextType {
  isOpen: boolean
  selectedUser: Usuario | null
  toggleUserMenu: () => void
  openUserMenu: (userIdOrUser?: number | Usuario) => void
  closeUserMenu: () => void
  isLoading: boolean
}

const UserMenuContext = createContext<UserMenuContextType | undefined>(undefined)

export function UserMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Usuario | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const toggleUserMenu = () => setIsOpen((prev) => !prev)

  const openUserMenu = async (userIdOrUser?: number | Usuario) => {
    if (!userIdOrUser) {
      // Open menu for current user
      setSelectedUser(null)
      setIsOpen(true)
      return
    }

    // If it's a number (user ID), fetch the user data
    if (typeof userIdOrUser === "number") {
      setIsLoading(true)
      setIsOpen(true)
      try {
        const userData = await getUserById(userIdOrUser)
        setSelectedUser(userData)
      } catch (error) {
        console.error("[v0] Error fetching user data:", error)
        setSelectedUser(null)
      } finally {
        setIsLoading(false)
      }
    } else {
      // If it's already a Usuario object, use it directly
      setSelectedUser(userIdOrUser)
      setIsOpen(true)
    }
  }

  const closeUserMenu = () => {
    setIsOpen(false)
    // Delay clearing the selected user to allow for animation
    setTimeout(() => setSelectedUser(null), 300)
  }

  return (
    <UserMenuContext.Provider value={{ isOpen, selectedUser, toggleUserMenu, openUserMenu, closeUserMenu, isLoading }}>
      {children}
    </UserMenuContext.Provider>
  )
}

export function useUserMenu() {
  const context = useContext(UserMenuContext)
  if (context === undefined) {
    throw new Error("useUserMenu must be used within a UserMenuProvider")
  }
  return context
}
