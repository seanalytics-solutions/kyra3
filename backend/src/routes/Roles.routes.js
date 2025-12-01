import { Router } from "express";
import { 
  obtenerRoles, 
  crearRol, 
  actualizarRol, 
  eliminarRol 
} from "../controllers/Roles.controller.js";

const router = Router();

// Listar y Crear
router.get("/", obtenerRoles);
router.post("/", crearRol);

// Modificar y Eliminar
router.patch("/:ID_Rol", actualizarRol);
router.delete("/:ID_Rol", eliminarRol);

export default router;