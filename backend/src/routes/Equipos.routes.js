import { Router } from "express";
import { 
  obtenerTodos,
  obtenerPorUsuario,
  obtenerDetalle,
  obtenerMiembros,
  crearEquipo,
  actualizarEquipo,
  eliminarEquipo,
  agregarMiembro,
  modificarRolMiembro,
  eliminarMiembro
} from "../controllers/Equipos.controller.js";

const router = Router();

// Rutas Generales de Equipos
router.get("/", obtenerTodos);
router.post("/", crearEquipo);
router.get("/:ID_Equipo", obtenerDetalle);
router.put("/:ID_Equipo", actualizarEquipo);
router.delete("/:ID_Equipo", eliminarEquipo);

// Rutas Específicas
router.get("/usuario/:ID_Usuario", obtenerPorUsuario);

// Gestión de Miembros
router.get("/:ID_Equipo/miembros", obtenerMiembros);
router.post("/:ID_Equipo/miembros", agregarMiembro);
router.patch("/:ID_Equipo/miembros/:ID_Usuario", modificarRolMiembro);
router.delete("/:ID_Equipo/miembros/:ID_Usuario", eliminarMiembro);

export default router;