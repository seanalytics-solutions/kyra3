import pool from "../config/db.js";

// --- OBTENER TODOS LOS PROYECTOS ---
export const obtenerTodos = async (req, res) => {
  try {
    const query = `
      SELECT
        p."ID_Proyecto",
        p."Nombre_Proyecto",
        p."Descripción_Proyecto",
        p."Estado_Proyecto",
        p."Fecha_Inicio",
        p."Fecha_Termino",
        json_build_object(
          'ID_Usuario', creador."ID_Usuario",
          'Nombre_Usuario', creador."Nombre_Usuario"
        ) AS "creador_proyecto",
        json_build_object(
          'ID_Equipo', e."ID_Equipo",
          'Nombre_Equipo', e."Nombre_Equipo"
        ) AS "equipo",
        (
          SELECT COUNT(*)
          FROM "Asignaciones" a
          WHERE a."ID_Proyecto" = p."ID_Proyecto"
        )::int AS "numero_asignaciones",
        COALESCE((
          SELECT ROUND(
            (COUNT(*) FILTER (WHERE a."Estado_Asignacion" = 'Completado') * 100.0) / NULLIF(COUNT(*), 0)
          )
          FROM "Asignaciones" a
          WHERE a."ID_Proyecto" = p."ID_Proyecto"
        ), 0)::int AS "avance"
      FROM "Proyectos" p
      LEFT JOIN "Usuarios" creador ON p."ID_Usuario_Creador" = creador."ID_Usuario"
      LEFT JOIN "Equipos" e ON p."ID_Equipo" = e."ID_Equipo"
      GROUP BY p."ID_Proyecto", creador."ID_Usuario", e."ID_Equipo"
      ORDER BY p."Fecha_Inicio" DESC;
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- ACTUALIZAR PROYECTO ---
export const actualizarProyecto = async (req, res) => {
  try {
    const { ID_Proyecto } = req.params;
    const { Nombre_Proyecto, Descripción_Proyecto, Estado_Proyecto, Fecha_Inicio, Fecha_Termino } = req.body;

    if (!Nombre_Proyecto || !Estado_Proyecto || !Fecha_Inicio) {
      return res.status(400).json({
        message: "Se requieren nombre, estado y fecha de inicio.",
      });
    }

    const query = `
      UPDATE "Proyectos" 
      SET 
        "Nombre_Proyecto" = $1,
        "Descripción_Proyecto" = $2,
        "Estado_Proyecto" = $3,
        "Fecha_Inicio" = $4,
        "Fecha_Termino" = $5
      WHERE "ID_Proyecto" = $6
      RETURNING *;
    `;

    const { rows, rowCount } = await pool.query(query, [
      Nombre_Proyecto,
      Descripción_Proyecto,
      Estado_Proyecto,
      Fecha_Inicio,
      Fecha_Termino,
      ID_Proyecto,
    ]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Proyecto no encontrado." });
    }

    res.status(200).json({
      message: "Proyecto actualizado correctamente.",
      proyecto: rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- ELIMINAR PROYECTO ---
export const eliminarProyecto = async (req, res) => {
  const { ID_Proyecto } = req.params;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Delete all assignments for this project
    await client.query('DELETE FROM "Asignaciones" WHERE "ID_Proyecto" = $1', [ID_Proyecto]);

    // Delete project
    const result = await client.query('DELETE FROM "Proyectos" WHERE "ID_Proyecto" = $1 RETURNING *', [ID_Proyecto]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Proyecto no encontrado." });
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Proyecto eliminado correctamente." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  } finally {
    client.release();
  }
};

// --- OBTENER PROYECTOS POR USUARIO ---
export const obtenerPorUsuario = async (req, res) => {
  try {
    const { ID_Usuario } = req.params;

    const query = `
            SELECT
                p."ID_Proyecto",
                p."Nombre_Proyecto",
                p."Estado_Proyecto",
                p."Fecha_Inicio",
                
                json_build_object(
                    'ID_Usuario', creador."ID_Usuario",
                    'Nombre_Usuario', creador."Nombre_Usuario",
                    'Correo', creador."Correo",
                    'Color', creador."Color"
                ) AS "creador_proyecto",

                (
                    SELECT COUNT(*)
                    FROM "Asignaciones" a
                    WHERE a."ID_Proyecto" = p."ID_Proyecto"
                )::int AS "numero_asignaciones",
                
                COALESCE((
                    SELECT ROUND(
                        (COUNT(*) FILTER (WHERE a."Estado_Asignacion" = 'Completado') * 100.0) / NULLIF(COUNT(*), 0)
                    )
                    FROM "Asignaciones" a
                    WHERE a."ID_Proyecto" = p."ID_Proyecto"
                ), 0)::int AS "avance",
                
                (
                    SELECT json_agg(
                        json_build_object(
                            'ID_Usuario', u."ID_Usuario",
                            'Nombre_Usuario', u."Nombre_Usuario",
                            'Correo', u."Correo",
                            'Color', u."Color"
                        )
                    )
                    FROM "Usuarios" u
                    JOIN "MiembrosEquipos" me ON u."ID_Usuario" = me."ID_Usuario"
                    WHERE me."ID_Equipo" = p."ID_Equipo"
                ) AS "equipo"
                
            FROM "Proyectos" p
            LEFT JOIN "Usuarios" creador ON p."ID_Usuario_Creador" = creador."ID_Usuario"
            WHERE 
                p."ID_Usuario_Creador" = $1 
                OR EXISTS (
                    SELECT 1
                    FROM "MiembrosEquipos" me
                    WHERE me."ID_Equipo" = p."ID_Equipo" AND me."ID_Usuario" = $1
                )   
            GROUP BY p."ID_Proyecto", creador."ID_Usuario"
            ORDER BY p."Fecha_Inicio" DESC;
        `;

    const { rows } = await pool.query(query, [ID_Usuario]);

    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los proyectos del usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- CREAR PROYECTO (Con lógica de equipo) ---
export const crearProyecto = async (req, res) => {
  const {
    Nombre_Proyecto,
    Descripción_Proyecto,
    Fecha_Inicio,
    Fecha_Termino,
    ID_Usuario_Creador,
    ID_Equipo,
    miembros,
  } = req.body;

  // Validación: se requiere al menos un equipo o una lista de miembros
  if (!Nombre_Proyecto || !Fecha_Inicio || !ID_Usuario_Creador) {
    return res.status(400).json({
      message: "Faltan datos. Se requiere nombre, fecha de inicio y creador.",
    });
  }

  if (!ID_Equipo && (!miembros || miembros.length === 0)) {
    return res.status(400).json({
      message: "Debe proporcionar un ID_Equipo o una lista de miembros.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    let idEquipoFinal = ID_Equipo;

    // Si no se proporcionó un equipo existente, crear uno nuevo con los miembros
    if (!ID_Equipo && miembros && miembros.length > 0) {

      // PASO 1: Crear un equipo con el nombre del proyecto
      const insertEquipoQuery = `
        INSERT INTO "Equipos" ("Nombre_Equipo", "ID_Usuario_Creador")
        VALUES ($1, $2)
        RETURNING "ID_Equipo";
      `;
      const equipoResult = await client.query(insertEquipoQuery, [Nombre_Proyecto, ID_Usuario_Creador]);
      idEquipoFinal = equipoResult.rows[0].ID_Equipo;

      // PASO 2: Asignar al creador al equipo con rol 'Creador'
      await client.query(
        `INSERT INTO "MiembrosEquipos" ("ID_Equipo", "ID_Usuario", "Rol_equipo") VALUES ($1, $2, 'Creador')`,
        [idEquipoFinal, ID_Usuario_Creador]
      );

      // PASO 3: Asignar a los otros miembros
      const otrosMiembros = miembros.filter((miembroId) => miembroId !== ID_Usuario_Creador);

      if (otrosMiembros.length > 0) {
        const values = otrosMiembros.flatMap((userId) => [idEquipoFinal, userId, "Miembro"]);
        const placeholders = otrosMiembros.map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`).join(", ");
        
        await client.query(
          `INSERT INTO "MiembrosEquipos" ("ID_Equipo", "ID_Usuario", "Rol_equipo") VALUES ${placeholders}`,
          values
        );
      }

      // PASO 4: Crear conversación de grupo para el equipo
      const todosLosMiembros = [ID_Usuario_Creador, ...otrosMiembros];
      
      const chatRes = await client.query(
        `INSERT INTO "Conversaciones" ("Nombre_Conversacion", "Es_Grupo", "ID_Equipo") VALUES ($1, true, $2) RETURNING "ID_Conversacion"`,
        [Nombre_Proyecto, idEquipoFinal]
      );
      const conversacionId = chatRes.rows[0].ID_Conversacion;

      if (todosLosMiembros.length > 0) {
        const chatValues = [];
        const chatPlaceholders = todosLosMiembros
          .map((userId, index) => {
            const offset = index * 2;
            chatValues.push(conversacionId, userId);
            return `($${offset + 1}, $${offset + 2})`;
          })
          .join(", ");

        await client.query(
          `INSERT INTO "Usuario_Conversacion" ("ID_Conversacion", "ID_Usuario") VALUES ${chatPlaceholders}`,
          chatValues
        );
      }
    }

    // PASO FINAL: Crear el proyecto vinculado al equipo
    const insertProyectoQuery = `
      INSERT INTO "Proyectos" (
        "Nombre_Proyecto", "Descripción_Proyecto", "Estado_Proyecto", 
        "Fecha_Inicio", "Fecha_Termino", "ID_Equipo", "ID_Usuario_Creador"
      ) VALUES ($1, $2, 'Pendiente', $3, $4, $5, $6)
      RETURNING "ID_Proyecto";
    `;
    const proyectoResult = await client.query(insertProyectoQuery, [
      Nombre_Proyecto,
      Descripción_Proyecto,
      Fecha_Inicio,
      Fecha_Termino,
      idEquipoFinal,
      ID_Usuario_Creador,
    ]);
    const newProjectId = proyectoResult.rows[0].ID_Proyecto;

    await client.query("COMMIT");

    res.status(201).json({
      message: "Proyecto creado exitosamente.",
      ID_Proyecto: newProjectId,
      ID_Equipo: idEquipoFinal,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[v0] Error al crear el proyecto:", error);
    res.status(500).json({ message: "Error interno del servidor.", error: error.message });
  } finally {
    client.release();
  }
};