import { Router } from "express";
import { 
  getStatistics, 
  getRecentProjects, 
  getTeamsOverview 
} from "../controllers/Admin.controller.js";

const router = Router();

// Estadísticas generales para el dashboard
router.get("/statistics", getStatistics);

// Proyectos recientes con progreso calculado
router.get("/projects/recent", getRecentProjects);

// Resumen de equipos con conteo de miembros y proyectos
router.get("/teams/overview", getTeamsOverview);

export default router;