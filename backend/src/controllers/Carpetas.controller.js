import pool from "../config/db.js";

// --- OBTENER CONTENIDO (Carpetas y Archivos) ---
export const getContenido = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const { carpeta_id, id_usuario_actual } = req.query;

    let carpetasQuery = 'SELECT * FROM "Carpetas" WHERE "ID_Equipo" = $1';
    const carpetasParams = [ID_Equipo];

    let archivosQuery = `
            SELECT 
                arc."ID_Archivo", 
                arc."Nombre_Archivo", 
                arc."Tamaño_Archivo", 
                arc."Tipo_Archivo", 
                arc."Fecha_Subida",
                dueño."Nombre_Usuario" AS "propietario",
                EXISTS (
                    SELECT 1 FROM "Favoritos" fav 
                    WHERE fav."ID_Archivo" = arc."ID_Archivo" 
                    AND fav."ID_Usuario" = $2
                ) AS "is_favorito"
            FROM "Archivo" arc
            LEFT JOIN "Usuarios" dueño ON arc."ID_Dueño" = dueño."ID_Usuario"
            WHERE arc."ID_Equipo" = $1
        `;

    const archivosParams = [ID_Equipo, id_usuario_actual || null];

    if (carpeta_id) {
      carpetasQuery += ' AND "Carpeta_Origen" = $2';
      carpetasParams.push(carpeta_id);

      archivosQuery += ' AND arc."ID_Carpeta" = $3';
      archivosParams.push(carpeta_id);
    } else {
      carpetasQuery += ' AND "Carpeta_Origen" IS NULL';
      archivosQuery += ' AND arc."ID_Carpeta" IS NULL';
    }

    carpetasQuery += ' ORDER BY "Nombre_Carpeta" ASC;';
    archivosQuery += ' ORDER BY arc."Nombre_Archivo" ASC;';

    const [carpetasResult, archivosResult] = await Promise.all([
      pool.query(carpetasQuery, carpetasParams),
      pool.query(archivosQuery, archivosParams),
    ]);

    res.status(200).json({
      carpetas: carpetasResult.rows,
      archivos: archivosResult.rows,
    });
  } catch (error) {
    console.error("Error al listar contenido del equipo:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- OBTENER RUTA DE NAVEGACIÓN (Breadcrumbs) ---
export const getRuta = async (req, res) => {
  try {
    const { ID_Carpeta } = req.params;

    // Consulta recursiva para construir la ruta hacia arriba
    const query = `
            WITH RECURSIVE folder_path AS (
                SELECT "ID_Carpeta", "Nombre_Carpeta", "Carpeta_Origen"
                FROM "Carpetas"
                WHERE "ID_Carpeta" = $1
                UNION ALL
                SELECT p."ID_Carpeta", p."Nombre_Carpeta", p."Carpeta_Origen"
                FROM "Carpetas" p
                JOIN folder_path fp ON p."ID_Carpeta" = fp."Carpeta_Origen"
            )
            SELECT "ID_Carpeta", "Nombre_Carpeta" FROM folder_path;
        `;

    const { rows } = await pool.query(query, [ID_Carpeta]);

    // La consulta devuelve la ruta desde la carpeta actual hacia la raíz.
    // Invertimos el array para que el frontend lo muestre correctamente (Raíz -> Carpeta Actual)
    res.status(200).json(rows.reverse());
  } catch (error) {
    console.error("Error al obtener la ruta de la carpeta:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- CREAR CARPETA ---
export const crearCarpeta = async (req, res) => {
  try {
    const { Nombre_Carpeta, ID_Equipo, Carpeta_Origen } = req.body;

    if (!Nombre_Carpeta || !ID_Equipo) {
      return res.status(400).json({ message: "Se requiere Nombre_Carpeta y ID_Equipo." });
    }

    const query = `
            INSERT INTO "Carpetas" ("Nombre_Carpeta", "ID_Equipo", "Carpeta_Origen")
            VALUES ($1, $2, $3)
            RETURNING *;
        `;

    const { rows } = await pool.query(query, [Nombre_Carpeta, ID_Equipo, Carpeta_Origen || null]);

    res.status(201).json({ message: "Carpeta creada exitosamente.", carpeta: rows[0] });
  } catch (error) {
    console.error("Error al crear la carpeta:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};