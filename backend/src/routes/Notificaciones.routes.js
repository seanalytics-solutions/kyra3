import { Router } from "express";
import { 
    obtenerNotificaciones, 
    marcarComoVista 
} from "../controllers/Notificaciones.controller.js";

const router = Router();

// Traer notificaciones por usuario
router.get("/:ID_Usuario", obtenerNotificaciones);

// Cambiar de estado a visto
router.patch("/:ID_Notificacion/visto", marcarComoVista);

export default router;