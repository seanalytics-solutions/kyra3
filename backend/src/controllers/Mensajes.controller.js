import pool from "../config/db.js";

// --- CREAR MENSAJE ---
export const crearMensaje = async (req, res) => {
  try {
    const { conversacionId, emisorId, receptorId, contenido } = req.body;

    // Validación de campos requeridos
    if (
      !conversacionId ||
      !emisorId ||
      !contenido ||
      contenido.trim() === ""
    ) {
      return res.status(400).json({
        message: "conversacionId, emisorId y contenido son requeridos",
      });
    }

    const conversacionIdInt = parseInt(conversacionId, 10);
    const emisorIdInt = parseInt(emisorId, 10);

    // Validación de tipos
    if (isNaN(conversacionIdInt) || isNaN(emisorIdInt)) {
      return res.status(400).json({
        message: "conversacionId y emisorId deben ser números válidos",
      });
    }

    // Verificar si es un grupo
    const conversacionQuery = `SELECT "Es_Grupo" FROM "Conversaciones" WHERE "ID_Conversacion" = $1`;
    const conversacionResult = await pool.query(conversacionQuery, [conversacionIdInt]);

    if (conversacionResult.rows.length === 0) {
      return res.status(404).json({ message: "Conversación no encontrada" });
    }

    const esGrupo = conversacionResult.rows[0].Es_Grupo;
    let receptorIdInt = null;

    // Validación específica para chats 1 a 1
    if (!esGrupo) {
      if (!receptorId) {
        return res.status(400).json({
          message: "receptorId es requerido para conversaciones 1-a-1",
        });
      }
      receptorIdInt = parseInt(receptorId, 10);
      if (isNaN(receptorIdInt)) {
        return res.status(400).json({
          message: "receptorId debe ser un número válido",
        });
      }
    }

    // Insertar Mensaje en BD
    const query = `
      INSERT INTO "Mensajes" ("ID_Conversacion", "Enviado_A", "Mensaje", "Fecha_Envio")
      VALUES ($1, $2, $3, NOW())
      RETURNING "ID_Mensaje" as id, "ID_Conversacion" as "conversacionId", "Enviado_A" as "receptorId", "Mensaje" as contenido, "Fecha_Envio" as timestamp
    `;
    const values = [conversacionIdInt, receptorIdInt, contenido];
    const { rows } = await pool.query(query, values);

    // Obtener nombre del emisor para la respuesta y notificación
    const usuarioQuery = `SELECT "Nombre_Usuario" FROM "Usuarios" WHERE "ID_Usuario" = $1`;
    const usuarioResult = await pool.query(usuarioQuery, [emisorIdInt]);
    const emisorNombre = usuarioResult.rows[0]?.Nombre_Usuario || "Usuario";

    // Crear Notificación (solo si hay un receptor definido)
    if (receptorIdInt) {
      try {
        const notificationQuery = `
          INSERT INTO "Notificaciones" ("ID_Usuario", "Tipo_Noti", "Detalles", "Visto", "Fecha")
          VALUES ($1, $2, $3, false, NOW())
        `;
        const notificationValues = [
          receptorIdInt,
          "mensaje",
          JSON.stringify({
            emisorId: emisorIdInt,
            emisorNombre: emisorNombre,
            mensaje: contenido,
            conversacionId: conversacionIdInt,
            message: `${emisorNombre} te envió un mensaje`,
          }),
        ];
        await pool.query(notificationQuery, notificationValues);
      } catch (notificationError) {
        console.error("[v0] Error creando notificación (no bloqueante):", notificationError.message);
      }
    }

    const nuevoMensaje = {
      id: rows[0].id,
      conversacionId: rows[0].conversacionId,
      emisorId: emisorIdInt,
      emisorNombre,
      receptorId: rows[0].receptorId,
      contenido: rows[0].contenido,
      timestamp: rows[0].timestamp,
      leido: false,
    };

    res.status(201).json(nuevoMensaje);
  } catch (error) {
    console.error("[v0] Error al guardar mensaje:", error.message);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};

// --- OBTENER MENSAJES DE UNA CONVERSACIÓN ---
export const obtenerMensajes = async (req, res) => {
  try {
    const { conversacionId } = req.params;

    const query = `
      SELECT DISTINCT ON (m."ID_Mensaje")
        m."ID_Mensaje" as id,
        m."ID_Conversacion" as "conversacionId",
        m."Enviado_A" as "receptorId",
        m."Mensaje" as contenido,
        m."Fecha_Envio" as timestamp,
        uc1."ID_Usuario" as "usuario1",
        uc2."ID_Usuario" as "usuario2"
      FROM "Mensajes" m
      JOIN "Usuario_Conversacion" uc1 ON m."ID_Conversacion" = uc1."ID_Conversacion"
      JOIN "Usuario_Conversacion" uc2 ON m."ID_Conversacion" = uc2."ID_Conversacion" 
        AND uc2."ID_Usuario" != uc1."ID_Usuario"
      WHERE m."ID_Conversacion" = $1
        AND uc1."ID_Usuario" = (
          SELECT "ID_Usuario" FROM "Usuario_Conversacion" 
          WHERE "ID_Conversacion" = $1 LIMIT 1
        )
      ORDER BY m."ID_Mensaje", m."Fecha_Envio" ASC
    `;

    const { rows } = await pool.query(query, [conversacionId]);

    const mensajes = await Promise.all(
      rows.map(async (row) => {
        // Determinar quién es el emisor basándose en quién NO es el receptor
        const emisorId = row.receptorId === row.usuario1 ? row.usuario2 : row.usuario1;

        let emisorNombre = "Usuario";
        if (emisorId) {
          const userQuery = `SELECT "Nombre_Usuario" FROM "Usuarios" WHERE "ID_Usuario" = $1`;
          const userResult = await pool.query(userQuery, [emisorId]);
          emisorNombre = userResult.rows[0]?.Nombre_Usuario || "Usuario";
        }

        return {
          id: row.id,
          conversacionId: row.conversacionId,
          emisorId: emisorId,
          emisorNombre: emisorNombre,
          receptorId: row.receptorId,
          contenido: row.contenido,
          timestamp: row.timestamp,
          leido: false,
        };
      })
    );

    res.status(200).json(mensajes);
  } catch (error) {
    console.error("[v0] Error al obtener mensajes:", error.message);
    res.status(500).json({ message: "Error interno del servidor", error: error.message });
  }
};