import { Router } from "express";
import { 
  login, 
  registro, 
  obtenerTodos, 
  obtenerPorId, 
  obtenerPorEquipo, 
  actualizarUsuario 
} from "../controllers/Usuarios.controller.js";

const router = Router();

// Rutas de Autenticación
router.post("/login", login);
router.post("/registro", registro);

// Rutas de Consulta
router.get("/", obtenerTodos);
router.get("/:id", obtenerPorId);
router.get("/equipos/:ID_Equipo", obtenerPorEquipo);

// Rutas de Modificación
router.put("/:id", actualizarUsuario);

export default router;