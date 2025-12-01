import { Router } from "express";
import upload from "../config/multer.js";
import { 
  subirArchivos, 
  obtenerPorEquipo, 
  renombrarArchivo, 
  toggleFavorito, 
  eliminarFavorito, 
  buscarArchivos, 
  obtenerDetalle, 
  eliminarArchivo, 
  descargarArchivo 
} from "../controllers/Archivos.controller.js";

const router = Router();

// Subir/Crear Archivo
router.post("/upload", upload.array("archivos"), subirArchivos);

// Traer por equipo
router.get("/equipo/:ID_Equipo", obtenerPorEquipo);

// Modificar nombre de archivo
router.patch("/:ID_Archivo/nombre", renombrarArchivo);

// Favoritos
router.post("/favoritos", toggleFavorito);
router.delete("/favoritos", eliminarFavorito);

// Buscar archivos
router.get("/equipo/:ID_Equipo/buscar", buscarArchivos);

// Obtener detalles, eliminar y descargar
router.get("/:ID_Archivo", obtenerDetalle);
router.delete("/:ID_Archivo", eliminarArchivo);
router.get("/:ID_Archivo/download", descargarArchivo);

export default router;