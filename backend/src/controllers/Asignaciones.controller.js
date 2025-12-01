import pool from "../config/db.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../../uploads");

export const obtenerTodas = async (req, res) => {
  try {
    const query = `
      SELECT
        a."ID_Asignacion", a."Titulo_Asignacion", a."Descripción_Asignacion",
        a."Prioridad", a."Estado_Asignacion", a."Fecha_Creacion", a."Fecha_Entrega",
        json_build_object('ID_Proyecto', p."ID_Proyecto", 'Nombre_Proyecto', p."Nombre_Proyecto") AS "proyecto",
        json_build_object('ID_Usuario', creador."ID_Usuario", 'Nombre_Usuario', creador."Nombre_Usuario") AS "creado_por",
        (
          SELECT json_agg(
            json_build_object('ID_Usuario', u."ID_Usuario", 'Nombre_Usuario', u."Nombre_Usuario", 'Color', u."Color")
          )
          FROM "Usuarios" u
          INNER JOIN "UsuariosAsignados" ua ON u."ID_Usuario" = ua."ID_Usuario"
          WHERE ua."ID_Asignacion" = a."ID_Asignacion"
        ) AS "usuarios_asignados"
      FROM "Asignaciones" a
      LEFT JOIN "Proyectos" p ON a."ID_Proyecto" = p."ID_Proyecto"
      LEFT JOIN "Usuarios" creador ON a."Creado_Por" = creador."ID_Usuario"
      GROUP BY a."ID_Asignacion", p."ID_Proyecto", creador."ID_Usuario"
      ORDER BY a."Fecha_Creacion" DESC;
    `;
    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener asignaciones:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- GET: Obtener asignaciones por usuario asignado ---
export const obtenerPorUsuario = async (req, res) => {
  try {
    const { ID_Usuario } = req.params;
    const query = `
      SELECT
        a."ID_Asignacion", a."Titulo_Asignacion", a."Descripción_Asignacion",
        a."Prioridad", a."Estado_Asignacion", a."Fecha_Creacion", a."Fecha_Entrega",
        p."Nombre_Proyecto", e."Nombre_Equipo",
        json_build_object('ID_Usuario', creador."ID_Usuario", 'Nombre_Usuario', creador."Nombre_Usuario", 'Color', creador."Color") AS "creado_por",
        (
          SELECT json_agg(
            json_build_object('ID_Usuario', u."ID_Usuario", 'Nombre_Usuario', u."Nombre_Usuario", 'Correo', u."Correo", 'Color', u."Color")
          )
          FROM "Usuarios" u
          INNER JOIN "UsuariosAsignados" ua_inner ON u."ID_Usuario" = ua_inner."ID_Usuario"
          WHERE ua_inner."ID_Asignacion" = a."ID_Asignacion"
        ) AS "usuarios_asignados"
      FROM "Asignaciones" a
      INNER JOIN "UsuariosAsignados" ua_outer ON a."ID_Asignacion" = ua_outer."ID_Asignacion"
      LEFT JOIN "Proyectos" p ON a."ID_Proyecto" = p."ID_Proyecto"
      LEFT JOIN "Equipos" e ON p."ID_Equipo" = e."ID_Equipo"
      LEFT JOIN "Usuarios" creador ON a."Creado_Por" = creador."ID_Usuario"
      WHERE ua_outer."ID_Usuario" = $1
      GROUP BY a."ID_Asignacion", creador."ID_Usuario", p."Nombre_Proyecto", e."Nombre_Equipo"
      ORDER BY a."Fecha_Creacion" DESC;
    `;
    const { rows } = await pool.query(query, [ID_Usuario]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener asignaciones de usuario:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- GET: Obtener asignaciones enviadas por el creador ---
export const obtenerEnviadas = async (req, res) => {
  try {
    const { ID_Usuario } = req.params;
    const query = `
      SELECT
        a."ID_Asignacion", a."Titulo_Asignacion", a."Descripción_Asignacion",
        a."Prioridad", a."Estado_Asignacion", a."Fecha_Creacion", a."Fecha_Entrega",
        p."Nombre_Proyecto", e."Nombre_Equipo",
        json_build_object('ID_Usuario', creador."ID_Usuario", 'Nombre_Usuario', creador."Nombre_Usuario", 'Color', creador."Color") AS "creado_por",
        (
          SELECT json_agg(
            json_build_object('ID_Usuario', u."ID_Usuario", 'Nombre_Usuario', u."Nombre_Usuario", 'Correo', u."Correo", 'Color', u."Color")
          )
          FROM "Usuarios" u
          INNER JOIN "UsuariosAsignados" ua_inner ON u."ID_Usuario" = ua_inner."ID_Usuario"
          WHERE ua_inner."ID_Asignacion" = a."ID_Asignacion"
        ) AS "usuarios_asignados"
      FROM "Asignaciones" a
      LEFT JOIN "Proyectos" p ON a."ID_Proyecto" = p."ID_Proyecto"
      LEFT JOIN "Equipos" e ON p."ID_Equipo" = e."ID_Equipo"
      LEFT JOIN "Usuarios" creador ON a."Creado_Por" = creador."ID_Usuario"
      WHERE a."Creado_Por" = $1 AND a."Estado_Asignacion" = 'Enviados'
      GROUP BY a."ID_Asignacion", creador."ID_Usuario", p."Nombre_Proyecto", e."Nombre_Equipo"
      ORDER BY a."Fecha_Creacion" DESC;
    `;
    const { rows } = await pool.query(query, [ID_Usuario]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener asignaciones enviadas:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- POST: Crear nueva asignación (con archivos y notificaciones) ---
export const crearAsignacion = async (req, res) => {
  const {
    Titulo_Asignacion, Descripción_Asignacion, Prioridad,
    Fecha_Entrega, ID_Proyecto, Creado_Por, usuarios
  } = req.body;

  let usuariosParsed = usuarios;
  if (typeof usuarios === "string") {
    try { usuariosParsed = JSON.parse(usuarios); } catch (e) {}
  }

  if (!Titulo_Asignacion || !Prioridad || !Fecha_Entrega || !Creado_Por || !usuariosParsed || usuariosParsed.length === 0) {
    return res.status(400).json({ message: "Faltan datos obligatorios." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Crear Asignación
    const insertQuery = `
      INSERT INTO "Asignaciones" ("Titulo_Asignacion", "Descripción_Asignacion", "Prioridad", "Estado_Asignacion", "Fecha_Entrega", "ID_Proyecto", "Creado_Por")
      VALUES ($1, $2, $3, 'Asignaciones', $4, $5, $6)
      RETURNING "ID_Asignacion";
    `;
    const asignacionResult = await client.query(insertQuery, [
      Titulo_Asignacion, Descripción_Asignacion, Prioridad, Fecha_Entrega, ID_Proyecto || null, Creado_Por
    ]);
    const newId = asignacionResult.rows[0].ID_Asignacion;

    // Asignar Usuarios
    const values = usuariosParsed.flatMap(userId => [newId, userId]);
    const placeholders = usuariosParsed.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(", ");
    await client.query(`INSERT INTO "UsuariosAsignados" ("ID_Asignacion", "ID_Usuario") VALUES ${placeholders}`, values);

    // Crear Notificaciones
    for (const userId of usuariosParsed) {
      const detalles = { titulo: Titulo_Asignacion, id_asignacion: newId, prioridad: Prioridad, message: `Nueva tarea: ${Titulo_Asignacion}` };
      await client.query(
        `INSERT INTO "Notificaciones" ("ID_Usuario", "Tipo_Noti", "Detalles", "Visto") VALUES ($1, $2, $3, false)`,
        [userId, "asignacion", JSON.stringify(detalles)]
      );
    }

    // Manejar Archivos
    if (req.files && req.files.length > 0) {
      let idEquipo = null;
      if (ID_Proyecto) {
        const eqRes = await client.query(`SELECT "ID_Equipo" FROM "Proyectos" WHERE "ID_Proyecto" = $1`, [ID_Proyecto]);
        idEquipo = eqRes.rows[0]?.ID_Equipo || null;
      }

      for (const file of req.files) {
        const fileQuery = `
          INSERT INTO "Archivo" ("ID_Equipo", "ID_Dueño", "Nombre_Archivo", "Tamaño_Archivo", "Tipo_Archivo", "StorageKey", "Ruta")
          VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING "ID_Archivo"
        `;
        const fileRes = await client.query(fileQuery, [
          idEquipo, Creado_Por, file.originalname, file.size, file.mimetype, file.path, `/uploads/${file.filename}`
        ]);
        
        await client.query(
          `INSERT INTO "Adjuntos" ("ID_Asignacion", "ID_Archivo", "Subido_Por", "Tipo") VALUES ($1, $2, $3, 'creation')`,
          [newId, fileRes.rows[0].ID_Archivo, Creado_Por]
        );
      }
    }

    await client.query("COMMIT");
    res.status(201).json({ message: "Asignación creada.", ID_Asignacion: newId });
  } catch (error) {
    await client.query("ROLLBACK");
    // Borrar archivos si falló la transacción
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    console.error("Error creando asignación:", error);
    res.status(500).json({ message: "Error interno." });
  } finally {
    client.release();
  }
};

// --- POST: Enviar Asignación (Subir trabajo) ---
export const enviarAsignacion = async (req, res) => {
  const { ID_Asignacion } = req.params;
  const { ID_Usuario } = req.body;

  if (!ID_Usuario) return res.status(400).json({ message: "Se requiere ID_Usuario." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Verificar y obtener estado anterior
    const prevRes = await client.query('SELECT "Estado_Asignacion" FROM "Asignaciones" WHERE "ID_Asignacion" = $1', [ID_Asignacion]);
    if (prevRes.rows.length === 0) throw new Error("Asignación no encontrada");
    const estadoAnterior = prevRes.rows[0].Estado_Asignacion;

    // Actualizar Estado
    await client.query('UPDATE "Asignaciones" SET "Estado_Asignacion" = $1 WHERE "ID_Asignacion" = $2', ["Enviados", ID_Asignacion]);

    // Historial
    await client.query(
      'INSERT INTO "Historial_Asignacion" ("ID_Asignacion", "ID_Usuario", "Estado_Anterior", "Estado_Nuevo") VALUES ($1, $2, $3, $4)',
      [ID_Asignacion, ID_Usuario, estadoAnterior, "Enviados"]
    );

    // Guardar Archivos
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const fileRes = await client.query(
          `INSERT INTO "Archivo" ("Nombre_Archivo", "Tamaño_Archivo", "Tipo_Archivo", "ID_Dueño", "StorageKey", "Ruta")
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING "ID_Archivo"`,
          [file.originalname, file.size, file.mimetype, ID_Usuario, file.path, `/uploads/${file.filename}`]
        );
        await client.query(
          `INSERT INTO "Adjuntos" ("ID_Asignacion", "ID_Archivo", "Subido_Por", "Tipo") VALUES ($1, $2, $3, 'submission')`,
          [ID_Asignacion, fileRes.rows[0].ID_Archivo, ID_Usuario]
        );
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Asignación enviada.", ID_Asignacion });
  } catch (error) {
    await client.query("ROLLBACK");
    if (req.files) req.files.forEach(f => fs.existsSync(f.path) && fs.unlinkSync(f.path));
    console.error("Error enviando asignación:", error);
    res.status(error.message === "Asignación no encontrada" ? 404 : 500).json({ message: error.message || "Error interno." });
  } finally {
    client.release();
  }
};

// --- PATCH: Cambiar Estado ---
export const cambiarEstado = async (req, res) => {
  const { ID_Asignacion } = req.params;
  const { ID_Usuario, nuevo_estado } = req.body;

  if (!ID_Usuario || !nuevo_estado) return res.status(400).json({ message: "Faltan datos." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const prevRes = await client.query('SELECT "Estado_Asignacion" FROM "Asignaciones" WHERE "ID_Asignacion" = $1', [ID_Asignacion]);
    if (prevRes.rows.length === 0) throw new Error("No encontrada");
    
    await client.query('UPDATE "Asignaciones" SET "Estado_Asignacion" = $1 WHERE "ID_Asignacion" = $2', [nuevo_estado, ID_Asignacion]);
    await client.query(
      'INSERT INTO "Historial_Asignacion" ("ID_Asignacion", "ID_Usuario", "Estado_Anterior", "Estado_Nuevo") VALUES ($1, $2, $3, $4)',
      [ID_Asignacion, ID_Usuario, prevRes.rows[0].Estado_Asignacion, nuevo_estado]
    );

    await client.query("COMMIT");
    res.status(200).json({ message: "Estado actualizado." });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: error.message || "Error interno." });
  } finally {
    client.release();
  }
};

// --- PATCH: Batch Update ---
export const batchUpdate = async (req, res) => {
  const { taskIds, updates } = req.body;
  if (!taskIds || !updates) return res.status(400).json({ message: "Faltan datos." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    if (updates.prioridad || updates.fecha_inicio || updates.fecha_termino) {
      let fields = [], values = [], idx = 1;
      if (updates.prioridad) { fields.push(`"Prioridad" = $${idx++}`); values.push(updates.prioridad); }
      if (updates.fecha_inicio) { fields.push(`"Fecha_Creacion" = $${idx++}`); values.push(updates.fecha_inicio); }
      if (updates.fecha_termino) { fields.push(`"Fecha_Entrega" = $${idx++}`); values.push(updates.fecha_termino); }
      
      values.push(taskIds);
      await client.query(`UPDATE "Asignaciones" SET ${fields.join(", ")} WHERE "ID_Asignacion" = ANY($${idx}::integer[])`, values);
    }

    if (updates.asignados) {
      await client.query('DELETE FROM "UsuariosAsignados" WHERE "ID_Asignacion" = ANY($1::integer[])', [taskIds]);
      const values = [], placeholders = [];
      let i = 1;
      for (const taskId of taskIds) {
        for (const userId of updates.asignados) {
          placeholders.push(`($${i++}, $${i++})`);
          values.push(taskId, userId);
        }
      }
      if (values.length > 0) {
        await client.query(`INSERT INTO "UsuariosAsignados" ("ID_Asignacion", "ID_Usuario") VALUES ${placeholders.join(", ")}`, values);
      }
    }

    await client.query("COMMIT");
    res.status(200).json({ message: "Tareas actualizadas." });
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(500).json({ message: "Error interno." });
  } finally {
    client.release();
  }
};

// --- OTROS MÉTODOS SIMPLES ---

export const obtenerHistorial = async (req, res) => {
  try {
    const query = `
      SELECT h.*, u."Nombre_Usuario", u."Color" 
      FROM "Historial_Asignacion" h 
      JOIN "Usuarios" u ON h."ID_Usuario" = u."ID_Usuario" 
      WHERE h."ID_Asignacion" = $1 ORDER BY h."Fecha_Cambio" DESC`;
    const { rows } = await pool.query(query, [req.params.ID_Asignacion]);
    res.status(200).json(rows);
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const obtenerArchivos = async (req, res) => {
  try {
    const query = `
      SELECT a.*, u."Nombre_Usuario" as subido_por, adj."Tipo" as tipo_adjunto 
      FROM "Archivo" a 
      INNER JOIN "Adjuntos" adj ON a."ID_Archivo" = adj."ID_Archivo"
      LEFT JOIN "Usuarios" u ON adj."Subido_Por" = u."ID_Usuario"
      WHERE adj."ID_Asignacion" = $1 ORDER BY a."Fecha_Subida" DESC`;
    const { rows } = await pool.query(query, [req.params.ID_Asignacion]);
    res.status(200).json(rows);
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const obtenerPorProyecto = async (req, res) => {
  try {
    const query = `
      SELECT a.*, (
        SELECT json_agg(json_build_object('ID_Usuario', u."ID_Usuario", 'Nombre_Usuario', u."Nombre_Usuario", 'Color', u."Color"))
        FROM "Usuarios" u JOIN "UsuariosAsignados" ua ON u."ID_Usuario" = ua."ID_Usuario"
        WHERE ua."ID_Asignacion" = a."ID_Asignacion"
      ) as "usuarios_asignados"
      FROM "Asignaciones" a WHERE "ID_Proyecto" = $1 ORDER BY "Fecha_Creacion" DESC`;
    const { rows } = await pool.query(query, [req.params.ID_Proyecto]);
    res.status(200).json(rows);
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const cambiarPrioridad = async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query(
      'UPDATE "Asignaciones" SET "Prioridad" = $1 WHERE "ID_Asignacion" = $2 RETURNING *',
      [req.body.Prioridad, req.params.ID_Asignacion]
    );
    if (rowCount === 0) return res.status(404).json({ message: "No encontrada" });
    res.status(200).json({ message: "Actualizado", asignacion: rows[0] });
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const cambiarFechaEntrega = async (req, res) => {
  try {
    const { rows, rowCount } = await pool.query(
      'UPDATE "Asignaciones" SET "Fecha_Entrega" = $1 WHERE "ID_Asignacion" = $2 RETURNING *',
      [req.body.Fecha_Entrega, req.params.ID_Asignacion]
    );
    if (rowCount === 0) return res.status(404).json({ message: "No encontrada" });
    res.status(200).json({ message: "Actualizado", asignacion: rows[0] });
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const modificarUsuarios = async (req, res) => {
  const { usuarios_a_anadir, usuarios_a_quitar } = req.body;
  const { ID_Asignacion } = req.params;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (usuarios_a_quitar?.length) {
      const ph = usuarios_a_quitar.map((_, i) => `$${i + 2}`).join(",");
      await client.query(`DELETE FROM "UsuariosAsignados" WHERE "ID_Asignacion" = $1 AND "ID_Usuario" IN (${ph})`, [ID_Asignacion, ...usuarios_a_quitar]);
    }
    if (usuarios_a_anadir?.length) {
      const vals = usuarios_a_anadir.flatMap(id => [ID_Asignacion, id]);
      const ph = usuarios_a_anadir.map((_, i) => `($${i * 2 + 1}, $${i * 2 + 2})`).join(",");
      await client.query(`INSERT INTO "UsuariosAsignados" ("ID_Asignacion", "ID_Usuario") VALUES ${ph} ON CONFLICT DO NOTHING`, vals);
    }
    await client.query("COMMIT");
    res.status(200).json({ message: "Usuarios actualizados." });
  } catch (e) { await client.query("ROLLBACK"); res.status(500).json({ message: "Error interno." }); } finally { client.release(); }
};

export const eliminarAsignacion = async (req, res) => {
  const { ID_Usuario_solicitante } = req.body;
  const { ID_Asignacion } = req.params;
  
  if (!ID_Usuario_solicitante) return res.status(400).json({ message: "Falta ID solicitante." });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const asigRes = await client.query('SELECT "Creado_Por" FROM "Asignaciones" WHERE "ID_Asignacion" = $1', [ID_Asignacion]);
    if (asigRes.rowCount === 0) throw new Error("No existe");
    
    // Validar permisos (Solo Creador o Admin)
    const rolRes = await client.query('SELECT r."Rol" FROM "Usuarios" u JOIN "Roles" r ON u."ID_Rol" = r."ID_Rol" WHERE u."ID_Usuario" = $1', [ID_Usuario_solicitante]);
    const esAdmin = rolRes.rows[0]?.Rol === "Admin";
    if (asigRes.rows[0].Creado_Por !== ID_Usuario_solicitante && !esAdmin) {
      return res.status(403).json({ message: "No autorizado." });
    }

    await client.query('DELETE FROM "Asignaciones" WHERE "ID_Asignacion" = $1', [ID_Asignacion]);
    await client.query("COMMIT");
    res.status(200).json({ message: "Eliminada." });
  } catch (e) { await client.query("ROLLBACK"); res.status(500).json({ message: e.message || "Error interno." }); } finally { client.release(); }
};

export const batchDelete = async (req, res) => {
  try {
    await pool.query('DELETE FROM "Asignaciones" WHERE "ID_Asignacion" = ANY($1::integer[])', [req.body.taskIds]);
    res.status(200).json({ message: "Eliminadas." });
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};

export const editarAsignacion = async (req, res) => {
  const { Titulo_Asignacion, Descripción_Asignacion, Prioridad, Estado_Asignacion, Fecha_Entrega, ID_Proyecto } = req.body;
  try {
    const { rows, rowCount } = await pool.query(
      `UPDATE "Asignaciones" SET "Titulo_Asignacion"=$1, "Descripción_Asignacion"=$2, "Prioridad"=$3, "Estado_Asignacion"=$4, "Fecha_Entrega"=$5, "ID_Proyecto"=$6 WHERE "ID_Asignacion"=$7 RETURNING *`,
      [Titulo_Asignacion, Descripción_Asignacion, Prioridad, Estado_Asignacion, Fecha_Entrega, ID_Proyecto, req.params.ID_Asignacion]
    );
    if (rowCount === 0) return res.status(404).json({ message: "No encontrada" });
    res.status(200).json({ message: "Actualizada", asignacion: rows[0] });
  } catch (e) { res.status(500).json({ message: "Error interno." }); }
};