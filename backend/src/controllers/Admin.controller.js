import pool from "../config/db.js";

// --- ESTADÍSTICAS GENERALES ---
export const getStatistics = async (req, res) => {
  try {
    // 1. Conteos Totales
    const usersCount = await pool.query('SELECT COUNT(*) as count FROM "Usuarios"');
    const teamsCount = await pool.query('SELECT COUNT(*) as count FROM "Equipos"');
    const projectsCount = await pool.query('SELECT COUNT(*) as count FROM "Proyectos"');
    const assignmentsCount = await pool.query('SELECT COUNT(*) as count FROM "Asignaciones"');

    // 2. Usuarios por Rol
    const usersByRole = await pool.query(`
      SELECT r."Rol" as role_name, COUNT(u."ID_Usuario")::int as count
      FROM "Usuarios" u
      LEFT JOIN "Roles" r ON u."ID_Rol" = r."ID_Rol"
      GROUP BY r."Rol"
      ORDER BY count DESC
    `);

    // 3. Proyectos por Estado
    const projectsByStatus = await pool.query(`
      SELECT "Estado_Proyecto" as status, COUNT(*)::int as count
      FROM "Proyectos"
      GROUP BY "Estado_Proyecto"
      ORDER BY count DESC
    `);

    // 4. Asignaciones por Estado
    const assignmentsByStatus = await pool.query(`
      SELECT "Estado_Asignacion" as status, COUNT(*)::int as count
      FROM "Asignaciones"
      GROUP BY "Estado_Asignacion"
      ORDER BY count DESC
    `);

    // 5. Actividad Reciente (últimas 10 asignaciones)
    const recentActivity = await pool.query(`
      SELECT 
        a."ID_Asignacion",
        a."Titulo_Asignacion",
        a."Estado_Asignacion",
        a."Fecha_Creacion",
        u."Nombre_Usuario" as creador_nombre,
        u."Color" as creador_color,
        p."Nombre_Proyecto"
      FROM "Asignaciones" a
      LEFT JOIN "Usuarios" u ON a."Creado_Por" = u."ID_Usuario"
      LEFT JOIN "Proyectos" p ON a."ID_Proyecto" = p."ID_Proyecto"
      ORDER BY a."Fecha_Creacion" DESC
      LIMIT 10
    `);

    res.status(200).json({
      totalUsers: parseInt(usersCount.rows[0].count),
      totalTeams: parseInt(teamsCount.rows[0].count),
      totalProjects: parseInt(projectsCount.rows[0].count),
      totalAssignments: parseInt(assignmentsCount.rows[0].count),
      usersByRole: usersByRole.rows.reduce((acc, row) => {
        acc[row.role_name || "Sin Rol"] = row.count;
        return acc;
      }, {}),
      projectsByStatus: projectsByStatus.rows,
      assignmentsByStatus: assignmentsByStatus.rows,
      recentActivity: recentActivity.rows,
    });
  } catch (error) {
    console.error("Error fetching admin statistics:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- PROYECTOS RECIENTES ---
export const getRecentProjects = async (req, res) => {
  try {
    const limit = req.query.limit || 5;

    const query = `
      SELECT 
        p."ID_Proyecto",
        p."Nombre_Proyecto",
        p."Estado_Proyecto",
        p."Fecha_Inicio",
        p."Fecha_Termino",
        u."Nombre_Usuario" as creador_nombre,
        u."Color" as creador_color,
        e."Nombre_Equipo",
        (
          SELECT COUNT(*)::int
          FROM "Asignaciones" a
          WHERE a."ID_Proyecto" = p."ID_Proyecto"
        ) AS total_asignaciones,
        COALESCE((
          SELECT ROUND(
            (COUNT(*) FILTER (WHERE a."Estado_Asignacion" = 'Completado') * 100.0) / NULLIF(COUNT(*), 0)
          )
          FROM "Asignaciones" a
          WHERE a."ID_Proyecto" = p."ID_Proyecto"
        ), 0)::int AS progreso
      FROM "Proyectos" p
      LEFT JOIN "Usuarios" u ON p."ID_Usuario_Creador" = u."ID_Usuario"
      LEFT JOIN "Equipos" e ON p."ID_Equipo" = e."ID_Equipo"
      ORDER BY p."Fecha_Inicio" DESC
      LIMIT $1
    `;

    const { rows } = await pool.query(query, [limit]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching recent projects:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- RESUMEN DE EQUIPOS ---
export const getTeamsOverview = async (req, res) => {
  try {
    const query = `
      SELECT 
        e."ID_Equipo",
        e."Nombre_Equipo",
        e."Fecha_Creacion",
        u."Nombre_Usuario" as creador_nombre,
        (
          SELECT COUNT(*)::int
          FROM "MiembrosEquipos" me
          WHERE me."ID_Equipo" = e."ID_Equipo"
        ) as total_miembros,
        (
          SELECT COUNT(*)::int
          FROM "Proyectos" p
          WHERE p."ID_Equipo" = e."ID_Equipo"
        ) as total_proyectos
      FROM "Equipos" e
      LEFT JOIN "Usuarios" u ON e."ID_Usuario_Creador" = u."ID_Usuario"
      ORDER BY e."Fecha_Creacion" DESC
      LIMIT 8
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching teams overview:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};