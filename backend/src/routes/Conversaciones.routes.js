import { Router } from "express";
import { 
  crearConversacion, 
  obtenerGrupoEquipo, 
  crearConversacionGrupo, 
  obtenerPorUsuario 
} from "../controllers/Conversaciones.controller.js";

const router = Router();

// Crear conversación 1 a 1
router.post("/", crearConversacion);

// Obtener chat de grupo de un equipo
router.get("/grupo/equipo/:idEquipo", obtenerGrupoEquipo);

// Crear conversación de grupo (endpoint manual)
router.post("/conversaciones-grupo", crearConversacionGrupo);

// Obtener todas las conversaciones de un usuario
router.get("/usuario/:usuarioId", obtenerPorUsuario);

export default router;