import { Router } from "express";
import { 
    obtenerNotasUsuario, 
    crearNota, 
    eliminarNota 
} from "../controllers/Notas.controller.js";

const router = Router();

// Traer notas por usuario
router.get("/:ID_Usuario", obtenerNotasUsuario);

// Crear nueva nota
router.post("/Notas", crearNota);

// Eliminar nota
router.delete("/:ID_Nota", eliminarNota);

export default router;