import { Router } from "express";
import { 
  getContenido, 
  getRuta, 
  crearCarpeta 
} from "../controllers/Carpetas.controller.js";

const router = Router();

// Traer contenido (carpetas y archivos) de un equipo
router.get("/:ID_Equipo/fs", getContenido);

// Obtener ruta de carpeta (breadcrumbs)
router.get("/:ID_Carpeta/path", getRuta);

// Crear carpeta
router.post("/", crearCarpeta);

export default router;