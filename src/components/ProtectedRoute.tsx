"use client"

import type React from "react"
import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useUser } from "@/context/userContext"
// 1. ELIMINAMOS la importación de la Sidebar aquí
// import SideBar from "@/components/organisms/SideBar" 
import Inbox from "@/components/organisms/Inbox"
import UserMenu from "@/components/organisms/UserMenu"
import { useInbox } from "@/context/inbox-context"

export function ProtectedRoute({ children, notifications = [] }: { children: React.ReactNode; notifications?: any[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading, usuario } = useUser()
  const { isOpen } = useInbox()

  const isLoginPage = pathname === "/login"

  useEffect(() => {
    // Si estás en login y autenticado, ir a Inicio
    if (isLoginPage && isAuthenticated) {
      router.push("/Inicio")
    }
    // Si NO estás en login y no estás autenticado, ir a login
    if (!isLoginPage && !loading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, loading, router, isLoginPage])

  // Pantalla de carga
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0a0a",
          color: "#ffffff",
        }}
      >
        Cargando...
      </div>
    )
  }

  if (isLoginPage) {
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {children}
      <Inbox initialNotifications={notifications} />
      <UserMenu />
    </>
  )
}