import pool from "../config/db.js";
import fs from "fs";
import path from "path";

// --- SUBIR ARCHIVOS ---
export const subirArchivos = async (req, res) => {
  try {
    const { ID_Equipo, ID_Dueno, ID_Carpeta } = req.body;

    if (!ID_Equipo || !ID_Dueno) {
      return res.status(400).json({ message: "Se requiere ID_Equipo y ID_Dueño." });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No se han subido archivos." });
    }

    const archivosGuardados = [];
    for (const file of req.files) {
      const { originalname, mimetype, size } = file;
      const storageKey = file.path;

      const query = `
        INSERT INTO "Archivo" (
            "ID_Equipo", "ID_Dueño", "Nombre_Archivo", "Tamaño_Archivo", 
            "Tipo_Archivo", "ID_Carpeta", "StorageKey", "Ruta"
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const { rows } = await pool.query(query, [
        ID_Equipo,
        ID_Dueno,
        originalname,
        size,
        mimetype,
        ID_Carpeta || null,
        storageKey,
        "/", // Ruta placeholder
      ]);

      archivosGuardados.push(rows[0]);
    }

    res.status(201).json({ message: "Archivos subidos y registrados exitosamente.", archivos: archivosGuardados });
  } catch (error) {
    console.error("Error al subir el archivo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER ARCHIVOS POR EQUIPO ---
export const obtenerPorEquipo = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const { id_usuario_actual } = req.query;

    if (!id_usuario_actual) {
      return res.status(400).json({ message: "Se requiere el ID del usuario actual." });
    }

    const query = `
            SELECT 
                arc."ID_Archivo",
                arc."Nombre_Archivo",
                arc."Tamaño_Archivo",
                arc."Fecha_Subida",
                arc."StorageKey",
                dueño."Nombre_Usuario" AS "propietario",
                asign."Estado_Asignacion" AS "estado",
                EXISTS (
                    SELECT 1 FROM "Favoritos" fav 
                    WHERE fav."ID_Archivo" = arc."ID_Archivo" AND fav."ID_Usuario" = $2
                ) AS "is_favorito"
            FROM "Archivo" arc
            LEFT JOIN "Usuarios" dueño ON arc."ID_Dueño" = dueño."ID_Usuario"
            LEFT JOIN "Adjuntos" adj ON arc."ID_Archivo" = adj."ID_Archivo"
            LEFT JOIN "Asignaciones" asign ON adj."ID_Asignacion" = asign."ID_Asignacion"
            WHERE arc."ID_Equipo" = $1
            ORDER BY arc."Fecha_Subida" DESC;
        `;
    const { rows } = await pool.query(query, [ID_Equipo, id_usuario_actual]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener los archivos del equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- RENOMBRAR ARCHIVO ---
export const renombrarArchivo = async (req, res) => {
  try {
    const { ID_Archivo } = req.params;
    const { Nombre_Archivo } = req.body;

    if (!Nombre_Archivo) {
      return res.status(400).json({ message: "Se requiere el nuevo 'Nombre_Archivo'." });
    }

    const query = `
            UPDATE "Archivo"
            SET "Nombre_Archivo" = $1
            WHERE "ID_Archivo" = $2
            RETURNING "ID_Archivo", "Nombre_Archivo";
        `;

    const { rows, rowCount } = await pool.query(query, [Nombre_Archivo, ID_Archivo]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "No se encontró el archivo especificado." });
    }

    res.status(200).json({
      message: "Nombre del archivo actualizado correctamente.",
      archivo: rows[0],
    });
  } catch (error) {
    console.error("Error al actualizar el nombre del archivo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- TOGGLE FAVORITO (Añadir/Quitar) ---
export const toggleFavorito = async (req, res) => {
  try {
    const { ID_Usuario, ID_Archivo } = req.body;

    if (!ID_Usuario || !ID_Archivo) {
      return res.status(400).json({ message: "Se requiere 'ID_Usuario' y 'ID_Archivo'." });
    }

    const checkQuery = `SELECT 1 FROM "Favoritos" WHERE "ID_Usuario" = $1 AND "ID_Archivo" = $2`;
    const { rowCount: exists } = await pool.query(checkQuery, [ID_Usuario, ID_Archivo]);

    if (exists > 0) {
      const deleteQuery = `DELETE FROM "Favoritos" WHERE "ID_Usuario" = $1 AND "ID_Archivo" = $2`;
      await pool.query(deleteQuery, [ID_Usuario, ID_Archivo]);
      return res.status(200).json({
        message: "Archivo quitado de favoritos.",
        is_favorito: false,
      });
    }

    const insertQuery = `
            INSERT INTO "Favoritos" ("ID_Usuario", "ID_Archivo")
            VALUES ($1, $2)
            RETURNING *;
        `;

    const { rows } = await pool.query(insertQuery, [ID_Usuario, ID_Archivo]);

    res.status(201).json({
      message: "Archivo añadido a favoritos.",
      favorito: rows[0],
      is_favorito: true,
    });
  } catch (error) {
    console.error("Error al toggle favoritos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- ELIMINAR DE FAVORITOS (Explícito) ---
export const eliminarFavorito = async (req, res) => {
  try {
    const { ID_Usuario, ID_Archivo } = req.body;

    if (!ID_Usuario || !ID_Archivo) {
      return res.status(400).json({ message: "Se requiere 'ID_Usuario' y 'ID_Archivo'." });
    }

    const query = `
            DELETE FROM "Favoritos"
            WHERE "ID_Usuario" = $1 AND "ID_Archivo" = $2;
        `;

    const { rowCount } = await pool.query(query, [ID_Usuario, ID_Archivo]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "No se encontró este archivo en los favoritos." });
    }

    res.status(200).json({ message: "Archivo quitado de favoritos correctamente." });
  } catch (error) {
    console.error("Error al quitar de favoritos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- BUSCAR ARCHIVOS ---
export const buscarArchivos = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const { q, tipo, propietario, fecha_inicio, fecha_fin, favoritos_de_usuario } = req.query;

    let baseQuery = `
            SELECT 
                arc."ID_Archivo",
                arc."Nombre_Archivo",
                arc."Tamaño_Archivo",
                arc."Fecha_Subida",
                dueño."Nombre_Usuario" AS "propietario"
            FROM "Archivo" arc
            LEFT JOIN "Usuarios" dueño ON arc."ID_Dueño" = dueño."ID_Usuario"
        `;

    const conditions = [];
    const values = [];
    let paramIndex = 1;

    conditions.push(`arc."ID_Equipo" = $${paramIndex++}`);
    values.push(ID_Equipo);

    if (favoritos_de_usuario) {
      baseQuery += ` INNER JOIN "Favoritos" f ON arc."ID_Archivo" = f."ID_Archivo"`;
      conditions.push(`f."ID_Usuario" = $${paramIndex++}`);
      values.push(favoritos_de_usuario);
    }

    if (q) {
      conditions.push(`arc."Nombre_Archivo" ILIKE $${paramIndex++}`);
      values.push(`%${q}%`);
    }

    if (tipo) {
      conditions.push(`arc."Tipo_Archivo" = $${paramIndex++}`);
      values.push(tipo);
    }

    if (propietario) {
      conditions.push(`arc."ID_Dueño" = $${paramIndex++}`);
      values.push(propietario);
    }

    if (fecha_inicio) {
      conditions.push(`arc."Fecha_Subida" >= $${paramIndex++}`);
      values.push(fecha_inicio);
    }
    if (fecha_fin) {
      conditions.push(`arc."Fecha_Subida" <= $${paramIndex++}`);
      values.push(fecha_fin);
    }

    const finalQuery = `
            ${baseQuery}
            WHERE ${conditions.join(" AND ")}
            ORDER BY arc."Fecha_Subida" DESC;
        `;

    const { rows } = await pool.query(finalQuery, values);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error en la búsqueda de archivos:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER DETALLE DE ARCHIVO ---
export const obtenerDetalle = async (req, res) => {
  try {
    const { ID_Archivo } = req.params;

    if (!ID_Archivo) return res.status(400).json({ message: "ID_Archivo es requerido." });

    const query = `
      SELECT 
        arc."ID_Archivo",
        arc."Nombre_Archivo",
        arc."Tamaño_Archivo",
        arc."Tipo_Archivo",
        arc."Fecha_Subida",
        arc."StorageKey",
        u."Nombre_Usuario" as "propietario"
      FROM "Archivo" arc
      LEFT JOIN "Usuarios" u ON arc."ID_Dueño" = u."ID_Usuario"
      WHERE arc."ID_Archivo" = $1
    `;

    const { rows } = await pool.query(query, [ID_Archivo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener detalles del archivo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- ELIMINAR ARCHIVO ---
export const eliminarArchivo = async (req, res) => {
  try {
    const { ID_Archivo } = req.params;

    if (!ID_Archivo) return res.status(400).json({ message: "ID_Archivo es requerido." });

    const getQuery = `SELECT "StorageKey" FROM "Archivo" WHERE "ID_Archivo" = $1`;
    const { rows } = await pool.query(getQuery, [ID_Archivo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    // Transacción implícita si no usamos BEGIN/COMMIT explícito, pero es seguro ejecutar en orden
    await pool.query(`DELETE FROM "Favoritos" WHERE "ID_Archivo" = $1`, [ID_Archivo]);
    await pool.query(`DELETE FROM "Archivo" WHERE "ID_Archivo" = $1`, [ID_Archivo]);

    const filePath = rows[0].StorageKey;
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: "Archivo eliminado correctamente." });
  } catch (error) {
    console.error("Error al eliminar el archivo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- DESCARGAR ARCHIVO ---
export const descargarArchivo = async (req, res) => {
  try {
    const { ID_Archivo } = req.params;

    if (!ID_Archivo) return res.status(400).json({ message: "ID_Archivo es requerido." });

    const query = `SELECT "Nombre_Archivo", "StorageKey" FROM "Archivo" WHERE "ID_Archivo" = $1`;
    const { rows } = await pool.query(query, [ID_Archivo]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Archivo no encontrado." });
    }

    const { Nombre_Archivo, StorageKey } = rows[0];

    res.download(StorageKey, Nombre_Archivo, (err) => {
      if (err) {
        console.error("Error al descargar el archivo:", err);
        // Verificar si los headers ya se enviaron para evitar error de doble respuesta
        if (!res.headersSent) {
            res.status(500).json({ message: "Error interno del servidor." });
        }
      }
    });
  } catch (error) {
    console.error("Error al descargar el archivo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};