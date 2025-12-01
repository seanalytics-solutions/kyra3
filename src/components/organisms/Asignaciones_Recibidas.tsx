"use client"

import type { Asignacion } from "@/types/Asignaciones"
import Icono_Perfil from "../atoms/Icono-Perfil"

interface AsignacionesRecibidasProps {
  asignaciones: Asignacion[]
  asignacionSeleccionada: string | null
  onSeleccionarAsignacion: (id: string) => void
}

export default function AsignacionesRecibidas({
  asignaciones,
  asignacionSeleccionada,
  onSeleccionarAsignacion,
}: AsignacionesRecibidasProps) {

  return (
    <div className="asignaciones-recibidas">
      <div className="asignaciones-recibidas-titulo">Asignaciones recibidas</div>
      <div className="asignaciones-lista">
        {asignaciones.length === 0 ? (
          <div className="asignaciones-vacio" style={{ padding: "2rem", textAlign: "center", color: "#999" }}>
            <p>No has recibido asignaciones</p>
          </div>
        ) : (
          asignaciones.map((asignacion) => (
            <div
              key={asignacion.id}
              className={`asignacion-item ${asignacionSeleccionada === asignacion.id ? "seleccionada" : ""}`}
              onClick={() => onSeleccionarAsignacion(asignacion.id)}
            >
              <div className="asignacion-autor">
                <div
                  onClick={(e) => {
                    e.stopPropagation()
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}
                >
                  <Icono_Perfil Nombre={asignacion.autor.nombre} color="#678933" userId={asignacion.autor.id} />
                  <span className="autor-nombre">{asignacion.autor.nombre}</span>
                </div>
              </div>
              <div className="asignacion-contenido">
                <h3 className="asignacion-titulo">{asignacion.titulo}</h3>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
