import pool from "../config/db.js";

// --- CREAR CONVERSACIÓN 1 a 1 ---
export const crearConversacion = async (req, res) => {
  try {
    const { usuario1Id, usuario2Id } = req.body;

    if (!usuario1Id || !usuario2Id) {
      return res.status(400).json({ message: "usuario1Id y usuario2Id son requeridos" });
    }

    // Verificar si ya existe conversación entre estos dos usuarios
    const verificarQuery = `
      SELECT c."ID_Conversacion"
      FROM "Conversaciones" c
      JOIN "Usuario_Conversacion" uc1 ON c."ID_Conversacion" = uc1."ID_Conversacion"
      JOIN "Usuario_Conversacion" uc2 ON c."ID_Conversacion" = uc2."ID_Conversacion"
      WHERE c."Es_Grupo" = false
        AND uc1."ID_Usuario" = $1
        AND uc2."ID_Usuario" = $2
      LIMIT 1
    `;

    const existente = await pool.query(verificarQuery, [usuario1Id, usuario2Id]);

    if (existente.rows.length > 0) {
      // Si ya existe, devolver la conversación existente
      return res.status(200).json({
        id: existente.rows[0].ID_Conversacion,
        usuario1Id,
        usuario2Id,
        esGrupo: false,
      });
    }

    // Crear nueva conversación
    const crearConversacionQuery = `
      INSERT INTO "Conversaciones" ("Nombre_Conversacion", "Es_Grupo", "ID_Equipo")
      VALUES (NULL, false, NULL)
      RETURNING "ID_Conversacion"
    `;

    const resultado = await pool.query(crearConversacionQuery);
    const conversacionId = resultado.rows[0].ID_Conversacion;

    // Asociar usuarios a la conversación
    const asociarUsuarioQuery = `
      INSERT INTO "Usuario_Conversacion" ("ID_Conversacion", "ID_Usuario", "LastReadAt")
      VALUES ($1, $2, NOW())
    `;

    await pool.query(asociarUsuarioQuery, [conversacionId, usuario1Id]);
    await pool.query(asociarUsuarioQuery, [conversacionId, usuario2Id]);

    res.status(201).json({
      id: conversacionId,
      usuario1Id,
      usuario2Id,
      esGrupo: false,
    });
  } catch (error) {
    console.error("Error al crear conversación:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- OBTENER CONVERSACIÓN DE GRUPO POR EQUIPO ---
export const obtenerGrupoEquipo = async (req, res) => {
  try {
    const { idEquipo } = req.params;

    const query = `
      SELECT 
        c."ID_Conversacion" as id,
        c."Nombre_Conversacion" as nombre,
        c."Es_Grupo" as "esGrupo"
      FROM "Conversaciones" c
      WHERE c."Es_Grupo" = true AND c."ID_Equipo" = $1
      LIMIT 1
    `;

    const { rows } = await pool.query(query, [idEquipo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "No existe conversación de grupo para este equipo" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener conversación de grupo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- CREAR CONVERSACIÓN DE GRUPO (MANUAL) ---
export const crearConversacionGrupo = async (req, res) => {
  try {
    const { nombreGrupo, idEquipo, miembrosIds } = req.body;

    if (!nombreGrupo || !idEquipo || !miembrosIds || miembrosIds.length === 0) {
      return res.status(400).json({ message: "Datos incompletos para crear conversación de grupo" });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const crearConversacionQuery = `
        INSERT INTO "Conversaciones" ("Nombre_Conversacion", "Es_Grupo", "ID_Equipo")
        VALUES ($1, true, $2)
        RETURNING "ID_Conversacion"
      `;

      const resultado = await client.query(crearConversacionQuery, [nombreGrupo, idEquipo]);
      const conversacionId = resultado.rows[0].ID_Conversacion;

      const values = [];
      const placeholders = miembrosIds
        .map((userId, index) => {
          const offset = index * 2;
          values.push(conversacionId, userId);
          return `($${offset + 1}, $${offset + 2}, NOW())`;
        })
        .join(", ");

      const asociarUsuariosQuery = `
        INSERT INTO "Usuario_Conversacion" ("ID_Conversacion", "ID_Usuario", "LastReadAt")
        VALUES ${placeholders}
      `;

      await client.query(asociarUsuariosQuery, values);
      await client.query("COMMIT");

      res.status(201).json({
        id: conversacionId,
        nombre: nombreGrupo,
        esGrupo: true,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("Error al crear conversación de grupo:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- OBTENER CONVERSACIONES DE UN USUARIO ---
export const obtenerPorUsuario = async (req, res) => {
  try {
    const { usuarioId } = req.params;

    const query = `
      SELECT DISTINCT ON (c."ID_Conversacion")
        c."ID_Conversacion" as id,
        c."Nombre_Conversacion",
        c."Es_Grupo",
        CASE 
          WHEN c."Es_Grupo" = true THEN c."Nombre_Conversacion"
          ELSE u."Nombre_Usuario"
        END as participante_nombre,
        CASE 
          WHEN c."Es_Grupo" = true THEN NULL
          ELSE u."ID_Usuario"
        END as participante_id,
        CASE 
          WHEN c."Es_Grupo" = true THEN NULL
          ELSE u."Color"
        END as participante_color,
        m."Mensaje" as ultimo_mensaje,
        m."Fecha_Envio" as ultimo_timestamp
      FROM "Conversaciones" c
      JOIN "Usuario_Conversacion" uc1 ON c."ID_Conversacion" = uc1."ID_Conversacion" 
        AND uc1."ID_Usuario" = $1
      LEFT JOIN "Usuario_Conversacion" uc2 ON c."ID_Conversacion" = uc2."ID_Conversacion" 
        AND uc2."ID_Usuario" != $1
      LEFT JOIN "Usuarios" u ON uc2."ID_Usuario" = u."ID_Usuario"
      LEFT JOIN LATERAL (
        SELECT "Mensaje", "Fecha_Envio"
        FROM "Mensajes"
        WHERE "ID_Conversacion" = c."ID_Conversacion"
        ORDER BY "Fecha_Envio" DESC
        LIMIT 1
      ) m ON true
      ORDER BY c."ID_Conversacion", m."Fecha_Envio" DESC NULLS LAST
    `;

    const { rows } = await pool.query(query, [usuarioId]);

    const conversaciones = rows
      .map((row) => ({
        id: row.id,
        nombre: row.participante_nombre,
        esGrupo: row.Es_Grupo,
        participante: {
          id: row.participante_id,
          nombre: row.participante_nombre,
          color: row.participante_color,
        },
        ultimoMensaje: row.ultimo_mensaje || "Sin mensajes aún",
        timestamp: row.ultimo_timestamp,
      }))
      .sort((a, b) => {
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : Number.NEGATIVE_INFINITY;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : Number.NEGATIVE_INFINITY;
        return dateB - dateA;
      });

    res.status(200).json(conversaciones);
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};