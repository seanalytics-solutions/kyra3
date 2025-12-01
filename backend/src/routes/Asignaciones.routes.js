import { Router } from "express";
import upload from "../config/multer.js";
import {
  obtenerTodas,
  obtenerPorUsuario,
  obtenerEnviadas,
  crearAsignacion,
  enviarAsignacion,
  cambiarEstado,
  obtenerHistorial,
  obtenerArchivos,
  obtenerPorProyecto,
  cambiarPrioridad,
  cambiarFechaEntrega,
  modificarUsuarios,
  eliminarAsignacion,
  batchUpdate,
  batchDelete,
  editarAsignacion
} from "../controllers/Asignaciones.controller.js";

const router = Router();

router.get("/", obtenerTodas);
router.post("/", upload.array("archivos"), crearAsignacion);

router.get("/usuarios/:ID_Usuario", obtenerPorUsuario);
router.get("/:ID_Usuario/enviadas", obtenerEnviadas);

router.get("/:ID_Asignacion/historial", obtenerHistorial);
router.get("/:ID_Asignacion/archivos", obtenerArchivos);
router.get("/proyecto/:ID_Proyecto", obtenerPorProyecto);

router.patch("/:ID_Asignacion/estado", cambiarEstado);
router.post("/:ID_Asignacion/enviar", upload.array("files"), enviarAsignacion);

router.patch("/:ID_Asignacion/prioridad", cambiarPrioridad);
router.patch("/:ID_Asignacion/fecha-entrega", cambiarFechaEntrega);
router.patch("/:ID_Asignacion/usuarios", modificarUsuarios);

router.delete("/:ID_Asignacion", eliminarAsignacion);
router.put("/:ID_Asignacion", editarAsignacion);

router.patch("/batch-update", batchUpdate);
router.delete("/batch-delete", batchDelete);

export default router;