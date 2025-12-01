import { Router } from "express";
import { 
  obtenerTodos, 
  crearProyecto, 
  actualizarProyecto, 
  eliminarProyecto, 
  obtenerPorUsuario 
} from "../controllers/Proyectos.controller.js";

const router = Router();

// CRUD Proyectos
router.get("/", obtenerTodos);
router.post("/", crearProyecto);
router.put("/:ID_Proyecto", actualizarProyecto);
router.delete("/:ID_Proyecto", eliminarProyecto);

// Filtros específicos
router.get("/usuario/:ID_Usuario", obtenerPorUsuario);

export default router;