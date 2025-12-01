"use client"

import Texto from "../atoms/Texto"
import { coloresporEstado } from "@/constantes/colores"
import type { AsignacionUI } from "@/types/Asignaciones"
import "@/styles/Asignaciones.css"
import BarraPrioridad from "../atoms/Barra-prioridad"

interface AsigApartadosProps {
  Estado: AsignacionUI["estado"]
  NumAsig: number
  Asignacion: AsignacionUI[]
  onSelectAsignacion: (asig: AsignacionUI) => void
}
 
export default function AsignacionesApartados({ Estado, NumAsig, Asignacion, onSelectAsignacion }: AsigApartadosProps) {
  const colores = coloresporEstado[Estado]

  return (
    <div style={{ backgroundColor: colores.fondo1 }} className="Asignaciones_apartado">
      <div style={{ backgroundColor: colores.titulo1 }} className="Asignaciones_apartado-titulo">
        <Texto Texto={Estado} />
        <Texto Texto={NumAsig.toString()} />
      </div>

      <div className="Asignaciones_apartado-contenido-contenedor">
        {Asignacion.length === 0 ? (
          <div className="Asignaciones_apartado-vacio">
            <p style={{ textAlign: "center", padding: "1rem", color: "#999" }}>Sin asignaciones</p>
          </div>
        ) : (
          Asignacion.map((asig) => (
            <div key={asig.id} className="Asignaciones_apartado-contenido" onClick={() => onSelectAsignacion(asig)}>
              <BarraPrioridad Prioridad={asig.prioridad} ancho="5px" alto="100%" />
              <div className="Asignaciones_apartado-contenido-texto">
                <p>{asig.titulo}</p>
                <p>Entrega: {asig.fecha_termino}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
