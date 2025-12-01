"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useUser } from "@/context/userContext"
import ProyectoCard from "@/components/organisms/Tarjeta_Proyecto"
import Crear_Proyecto from "@/components/organisms/Crear_Proyecto"
import Barra_Modificaciones from "@/components/organisms/Barra_Modificaiones"
import "@/styles/Proyectos.css"

// Servicios y Tipos
import { getProyectosByUsuario, createProyecto } from "@/services/proyectos.service"
import { getAllUsers } from "@/services/Usuarios.service"
import { batchUpdateAsignaciones, batchDeleteAsignaciones } from "@/services/Asignaciones.service"
import type { ApiProyecto, ProyectoUI, NuevoProyectoForm } from "@/types/Proyectos"
import type { Usuario } from "@/types/Usuario"
import { usePermissions } from "@/hooks/usePermissions"

function formatearFecha(fechaISO: string): string {
  if (!fechaISO) return "N/A"
  return new Date(fechaISO).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" })
}

export default function ProyectosPage() {
  const searchParams = useSearchParams()
  const proyectoIdAExpandir = searchParams.get("proyecto")
  const { usuario } = useUser()

  const [proyectos, setProyectos] = useState<ProyectoUI[]>([])
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [tareasSeleccionadas, setTareasSeleccionadas] = useState<string[]>([])
  const [showCrearProyecto, setShowCrearProyecto] = useState(false)
  const { canCreateProject } = usePermissions()

  const idUsuarioActual = usuario?.id

  const fetchProyectos = async () => {
    if (!idUsuarioActual) return

    setLoading(true)
    try {
      const [dataProyectos, dataUsuarios] = await Promise.all([getProyectosByUsuario(idUsuarioActual), getAllUsers()])

      setUsuarios(dataUsuarios)

      const proyectosUI: ProyectoUI[] = dataProyectos.map((p: ApiProyecto) => ({
        id: String(p.ID_Proyecto),
        nombre: p.Nombre_Proyecto,
        fechaInicio: formatearFecha(p.Fecha_Inicio),
        estado: p.Estado_Proyecto,
        avance: p.avance,
        equipo: (p.equipo || []).map((m) => ({
          id: String(m.ID_Usuario),
          nombre: m.Nombre_Usuario,
          color: m.Color,
        })),
        asignaciones: [],
        enProceso: [],
        enviados: [],
        correcciones: [],
        terminados: [],
      }))

      setProyectos(proyectosUI)
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProyectos()
  }, [idUsuarioActual])

  const handleCrearProyecto = async (
    datosFormulario: NuevoProyectoForm & { equipoId?: number; crearNuevoEquipo?: boolean },
  ) => {
    if (!idUsuarioActual) return

    try {
      const datosParaAPI: any = {
        Nombre_Proyecto: datosFormulario.titulo,
        Descripción_Proyecto: datosFormulario.descripcion,
        Fecha_Inicio: datosFormulario.fecha_inicio,
        Fecha_Termino: datosFormulario.fecha_termino,
        ID_Usuario_Creador: idUsuarioActual,
      }

      // Si se seleccionó un equipo existente, enviamos el ID del equipo
      if (datosFormulario.equipoId) {
        datosParaAPI.ID_Equipo = datosFormulario.equipoId
      }
      // Si se seleccionaron usuarios individuales, enviamos el array de miembros
      // El backend creará automáticamente un equipo con el nombre del proyecto
      else if (datosFormulario.miembros && datosFormulario.miembros.length > 0) {
        datosParaAPI.miembros = datosFormulario.miembros
      }

      await createProyecto(datosParaAPI)
      setShowCrearProyecto(false)
      await fetchProyectos()
    } catch (error) {
      console.error("[v0] Error al crear el proyecto:", error)
      alert(`No se pudo crear el proyecto: ${error instanceof Error ? error.message : "Error desconocido"}`)
    }
  }

  const handleSeleccionTarea = (tareaId: string) => {
    setTareasSeleccionadas((prev) =>
      prev.includes(tareaId) ? prev.filter((id) => id !== tareaId) : [...prev, tareaId],
    )
  }

  const handleCerrarSeleccion = () => setTareasSeleccionadas([])

  const handleBatchUpdate = async (taskIds: string[], updates: any) => {
    try {
      await batchUpdateAsignaciones(taskIds, updates)
      alert("Tareas actualizadas con éxito")
      setTareasSeleccionadas([])
      await fetchProyectos()
    } catch (error) {
      console.error("Error al actualizar tareas:", error)
      alert("No se pudieron actualizar las tareas.")
    }
  }

  const handleBatchDelete = async (taskIds: string[]) => {
    if (!window.confirm(`¿Seguro que quieres eliminar ${taskIds.length} tareas?`)) return
    try {
      await batchDeleteAsignaciones(taskIds)
      alert("Tareas eliminadas con éxito")
      setTareasSeleccionadas([])
      await fetchProyectos()
    } catch (error) {
      console.error("Error al eliminar tareas:", error)
      alert("No se pudieron eliminar las tareas.")
    }
  }

  if (loading) {
    return (
      <div className="loading-container">
        <p>Cargando proyectos...</p>
      </div>
    )
  }

  const usuariosParaModal = usuarios.map((u) => ({
    id: u.ID_Usuario,
    nombre: u.Nombre_Usuario,
  }))

  return (
    <div className="Proyectos_Contenedor">
      <div className="Proyectos_Titulo">
        <h1>PROYECTOS</h1>
        {canCreateProject && (
          <button className="Btn_Crear_Proyecto" onClick={() => setShowCrearProyecto(true)}>
            Crear nuevo proyecto
          </button>
        )}
      </div>

      <div className="Proyectos_Lista">
        {proyectos.map((proyecto) => (
          <ProyectoCard
            key={proyecto.id}
            proyecto={proyecto}
            tareasSeleccionadas={tareasSeleccionadas}
            onSeleccionTarea={handleSeleccionTarea}
            debeExpandirse={proyectoIdAExpandir === proyecto.id}
          />
        ))}
      </div>

      {tareasSeleccionadas.length > 0 && (
        <Barra_Modificaciones
          tareasSeleccionadas={tareasSeleccionadas}
          usuarios={usuariosParaModal}
          onClose={handleCerrarSeleccion}
          onUpdate={handleBatchUpdate}
          onDelete={handleBatchDelete}
        />
      )}

      {showCrearProyecto && (
        <Crear_Proyecto
          onClose={() => setShowCrearProyecto(false)}
          onCrearProyecto={handleCrearProyecto}
          usuarios={usuariosParaModal}
        />
      )}
    </div>
  )
}
