import React from "react"
// Asegúrate de importar desde la ruta correcta
import SideBar from "@/components/organisms/SideBar" 

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-row h-screen w-full overflow-hidden bg-gray-50">
      <aside className="sidebar w-64 shrink-0 h-full relative border-r bg-white hidden md:block">
        <SideBar />
      </aside>

      <main style={{ marginLeft: '200px' }}>
        {children}
      </main>
      
    </div>
  )
}
