import { Router } from "express";
import { crearMensaje, obtenerMensajes } from "../controllers/Mensajes.controller.js";

const router = Router();

// Crear un nuevo mensaje
router.post("/", crearMensaje);

// Obtener todos los mensajes de una conversación
router.get("/:conversacionId", obtenerMensajes);

export default router;