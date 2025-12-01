import pool from "../config/db.js";

// --- OBTENER TODOS LOS EQUIPOS ---
export const obtenerTodos = async (req, res) => {
  try {
    const query = `
      SELECT 
        e."ID_Equipo",
        e."Nombre_Equipo",
        e."Fecha_Creacion",
        json_build_object(
          'ID_Usuario', creador."ID_Usuario",
          'Nombre_Usuario', creador."Nombre_Usuario"
        ) AS "creador_equipo",
        (
          SELECT COUNT(*)
          FROM "MiembrosEquipos" me
          WHERE me."ID_Equipo" = e."ID_Equipo"
        )::int AS "numero_miembros"
      FROM "Equipos" e
      LEFT JOIN "Usuarios" creador ON e."ID_Usuario_Creador" = creador."ID_Usuario"
      GROUP BY e."ID_Equipo", creador."ID_Usuario"
      ORDER BY e."Fecha_Creacion" DESC;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener equipos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER EQUIPOS POR USUARIO ---
export const obtenerPorUsuario = async (req, res) => {
  try {
    const { ID_Usuario } = req.params;

    const query = `
            SELECT 
                e."ID_Equipo",
                e."Nombre_Equipo",
                e."Fecha_Creacion",
                json_build_object(
                    'ID_Usuario', creador."ID_Usuario",
                    'Nombre_Usuario', creador."Nombre_Usuario"
                ) AS "creador_equipo",
                (
                    SELECT json_agg(
                        json_build_object(
                            'ID_Usuario', miembro."ID_Usuario",
                            'Nombre_Usuario', miembro."Nombre_Usuario",
                            'Correo', miembro."Correo",
                            'Color', miembro."Color"
                        )
                    )
                    FROM "MiembrosEquipos" me
                    JOIN "Usuarios" miembro ON me."ID_Usuario" = miembro."ID_Usuario"
                    WHERE me."ID_Equipo" = e."ID_Equipo"
                ) AS "miembros"
            FROM "Equipos" e
            LEFT JOIN "Usuarios" creador ON e."ID_Usuario_Creador" = creador."ID_Usuario"
            WHERE
                e."ID_Usuario_Creador" = $1
                OR EXISTS (
                    SELECT 1
                    FROM "MiembrosEquipos" me
                    WHERE me."ID_Equipo" = e."ID_Equipo" AND me."ID_Usuario" = $1
                )
            GROUP BY e."ID_Equipo", creador."ID_Usuario"
            ORDER BY e."Fecha_Creacion" DESC;
        `;

    const { rows } = await pool.query(query, [ID_Usuario]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los equipos del usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER MIEMBROS DE UN EQUIPO ---
export const obtenerMiembros = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;

    const query = `
            SELECT 
                u."ID_Usuario", u."Nombre_Usuario", u."Correo", u."Color", me."Rol_equipo"
            FROM "Usuarios" u
            JOIN "MiembrosEquipos" me ON u."ID_Usuario" = me."ID_Usuario"
            WHERE me."ID_Equipo" = $1
            ORDER BY u."Nombre_Usuario" ASC;
        `;

    const { rows } = await pool.query(query, [ID_Equipo]);

    if (rows.length === 0) {
      const teamExists = await pool.query('SELECT 1 FROM "Equipos" WHERE "ID_Equipo" = $1', [ID_Equipo]);
      if (teamExists.rowCount === 0) {
        return res.status(404).json({ message: "El equipo no existe." });
      }
    }

    res.status(200).json(rows);
  } catch (error) {
    console.error("❌ Error al obtener los miembros del equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER DETALLE DE UN EQUIPO ---
export const obtenerDetalle = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;

    const query = `
      SELECT 
        e."ID_Equipo",
        e."Nombre_Equipo",
        e."Fecha_Creacion",
        json_build_object(
          'ID_Usuario', creador."ID_Usuario",
          'Nombre_Usuario', creador."Nombre_Usuario"
        ) AS "creador_equipo",
        (
          SELECT COUNT(*)
          FROM "MiembrosEquipos" me
          WHERE me."ID_Equipo" = e."ID_Equipo"
        )::int AS "numero_miembros"
      FROM "Equipos" e
      LEFT JOIN "Usuarios" creador ON e."ID_Usuario_Creador" = creador."ID_Usuario"
      WHERE e."ID_Equipo" = $1
      GROUP BY e."ID_Equipo", creador."ID_Usuario";
    `;

    const { rows } = await pool.query(query, [ID_Equipo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Equipo no encontrado." });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener detalles del equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- CREAR EQUIPO (Con Transacción y Chat) ---
export const crearEquipo = async (req, res) => {
  const { Nombre_Equipo, ID_Usuario_Creador, miembros } = req.body;

  if (!Nombre_Equipo || !ID_Usuario_Creador || !miembros || miembros.length === 0) {
    return res.status(400).json({
      message: "Faltan datos. Se requiere nombre del equipo, ID del creador y al menos un miembro.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Crear Equipo
    const insertEquipoQuery = `
            INSERT INTO "Equipos" ("Nombre_Equipo", "ID_Usuario_Creador")
            VALUES ($1, $2)
            RETURNING "ID_Equipo";
        `;
    const equipoResult = await client.query(insertEquipoQuery, [Nombre_Equipo, ID_Usuario_Creador]);
    const newTeamId = equipoResult.rows[0].ID_Equipo;

    // 2. Insertar Creador como miembro
    await client.query(
      `INSERT INTO "MiembrosEquipos" ("ID_Equipo", "ID_Usuario", "Rol_equipo") VALUES ($1, $2, 'Creador')`,
      [newTeamId, ID_Usuario_Creador]
    );

    // 3. Insertar otros miembros
    const otrosMiembros = miembros.filter((miembroId) => miembroId !== ID_Usuario_Creador);
    if (otrosMiembros.length > 0) {
      const values = [];
      const placeholders = otrosMiembros
        .map((userId, index) => {
          const offset = index * 3;
          values.push(newTeamId, userId, "Miembro");
          return `($${offset + 1}, $${offset + 2}, $${offset + 3})`;
        })
        .join(", ");

      await client.query(
        `INSERT INTO "MiembrosEquipos" ("ID_Equipo", "ID_Usuario", "Rol_equipo") VALUES ${placeholders}`,
        values
      );
    }

    // 4. Crear Conversación de Grupo (Lógica auxiliar integrada)
    const todosLosMiembros = [ID_Usuario_Creador, ...otrosMiembros];
    
    // Crear conversación
    const chatRes = await client.query(
      `INSERT INTO "Conversaciones" ("Nombre_Conversacion", "Es_Grupo", "ID_Equipo") VALUES ($1, true, $2) RETURNING "ID_Conversacion"`,
      [Nombre_Equipo, newTeamId]
    );
    const conversacionId = chatRes.rows[0].ID_Conversacion;

    // Asociar usuarios al chat
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
        `INSERT INTO "Usuario_Conversacion" ("ID_Conversacion", "ID_Usuario", "LastReadAt") VALUES ${chatPlaceholders}`,
        chatValues
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Equipo creado y roles asignados correctamente.",
      ID_Equipo: newTeamId,
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al crear el equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  } finally {
    client.release();
  }
};

// --- ACTUALIZAR EQUIPO ---
export const actualizarEquipo = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const { Nombre_Equipo } = req.body;

    if (!Nombre_Equipo) {
      return res.status(400).json({ message: "Se requiere el nombre del equipo." });
    }

    const query = `
      UPDATE "Equipos" 
      SET "Nombre_Equipo" = $1
      WHERE "ID_Equipo" = $2
      RETURNING *;
    `;
    const { rows, rowCount } = await pool.query(query, [Nombre_Equipo, ID_Equipo]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Equipo no encontrado." });
    }

    res.status(200).json({ message: "Equipo actualizado correctamente.", equipo: rows[0] });
  } catch (error) {
    console.error("Error al actualizar equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- ELIMINAR EQUIPO ---
export const eliminarEquipo = async (req, res) => {
  const { ID_Equipo } = req.params;
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    const projectsCheck = await client.query('SELECT COUNT(*) FROM "Proyectos" WHERE "ID_Equipo" = $1', [ID_Equipo]);
    if (parseInt(projectsCheck.rows[0].count) > 0) {
      return res.status(400).json({ message: "No se puede eliminar el equipo porque tiene proyectos asociados." });
    }

    await client.query('DELETE FROM "MiembrosEquipos" WHERE "ID_Equipo" = $1', [ID_Equipo]);
    const result = await client.query('DELETE FROM "Equipos" WHERE "ID_Equipo" = $1 RETURNING *', [ID_Equipo]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Equipo no encontrado." });
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Equipo eliminado correctamente." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error al eliminar equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  } finally {
    client.release();
  }
};

// --- GESTIÓN DE MIEMBROS (Añadir, Modificar Rol, Eliminar) ---

export const agregarMiembro = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const { ID_Usuario } = req.body;

    if (!ID_Usuario) return res.status(400).json({ message: "Se requiere ID_Usuario." });

    const query = `
            INSERT INTO "MiembrosEquipos" ("ID_Equipo", "ID_Usuario", "Rol_equipo")
            VALUES ($1, $2, 'Miembro')
            RETURNING *;
        `;
    const { rows } = await pool.query(query, [ID_Equipo, ID_Usuario]);
    res.status(201).json({ message: "✅ Miembro añadido.", miembro: rows[0] });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "El usuario ya es miembro." });
    console.error("❌ Error al añadir miembro:", error);
    res.status(500).json({ message: "Error interno." });
  }
};

export const modificarRolMiembro = async (req, res) => {
  try {
    const { ID_Equipo, ID_Usuario } = req.params;
    const { nuevo_rol, ID_Usuario_Actual } = req.body;

    if (!nuevo_rol || !["Admin", "Miembro"].includes(nuevo_rol)) {
      return res.status(400).json({ message: "Rol inválido." });
    }

    // Validaciones de permisos (simplificadas para brevedad, pero mantenidas)
    if (ID_Usuario_Actual) {
      const permRes = await pool.query(`SELECT "Rol_equipo" FROM "MiembrosEquipos" WHERE "ID_Equipo"=$1 AND "ID_Usuario"=$2`, [ID_Equipo, ID_Usuario_Actual]);
      if (permRes.rowCount === 0 || !["Creador", "Admin"].includes(permRes.rows[0].Rol_equipo)) {
        return res.status(403).json({ message: "No autorizado." });
      }
    }

    const creatorCheck = await pool.query(`SELECT "Rol_equipo" FROM "MiembrosEquipos" WHERE "ID_Equipo"=$1 AND "ID_Usuario"=$2`, [ID_Equipo, ID_Usuario]);
    if (creatorCheck.rows[0]?.Rol_equipo === "Creador") return res.status(403).json({ message: "No puedes cambiar el rol del Creador." });

    const { rows, rowCount } = await pool.query(
      `UPDATE "MiembrosEquipos" SET "Rol_equipo" = $1 WHERE "ID_Equipo" = $2 AND "ID_Usuario" = $3 RETURNING *`,
      [nuevo_rol, ID_Equipo, ID_Usuario]
    );

    if (rowCount === 0) return res.status(404).json({ message: "Miembro no encontrado." });
    res.status(200).json({ message: "Rol actualizado.", miembro: rows[0] });
  } catch (error) {
    console.error("Error actualizando rol:", error);
    res.status(500).json({ message: "Error interno." });
  }
};

export const eliminarMiembro = async (req, res) => {
  try {
    const { ID_Equipo, ID_Usuario } = req.params;
    const { ID_Usuario_Actual } = req.query;

    if (ID_Usuario_Actual) {
      const permRes = await pool.query(`SELECT "Rol_equipo" FROM "MiembrosEquipos" WHERE "ID_Equipo"=$1 AND "ID_Usuario"=$2`, [ID_Equipo, ID_Usuario_Actual]);
      if (permRes.rowCount === 0 || !["Creador", "Admin"].includes(permRes.rows[0].Rol_equipo)) {
        return res.status(403).json({ message: "No autorizado." });
      }
    }

    const targetCheck = await pool.query(`SELECT "Rol_equipo" FROM "MiembrosEquipos" WHERE "ID_Equipo"=$1 AND "ID_Usuario"=$2`, [ID_Equipo, ID_Usuario]);
    if (targetCheck.rows[0]?.Rol_equipo === "Creador") return res.status(403).json({ message: "No puedes eliminar al Creador." });

    const { rowCount } = await pool.query(`DELETE FROM "MiembrosEquipos" WHERE "ID_Equipo" = $1 AND "ID_Usuario" = $2`, [ID_Equipo, ID_Usuario]);
    
    if (rowCount === 0) return res.status(404).json({ message: "Miembro no encontrado." });
    res.status(200).json({ message: "✅ Miembro eliminado." });
  } catch (error) {
    console.error("❌ Error eliminando miembro:", error);
    res.status(500).json({ message: "Error interno." });
  }
};