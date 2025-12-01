import pool from "../config/db.js";

// --- OBTENER NOTAS POR USUARIO ---
export const obtenerNotasUsuario = async (req, res) => {
    try {
        const { ID_Usuario } = req.params;

        const query = `
            SELECT
                n."ID_Nota",
                n."Contenido_Nota",
                n."Fecha_Creacion"
            FROM "Notas" n
            WHERE n."ID_Usuario" = $1
            ORDER BY n."Fecha_Creacion" DESC;
        `;

        const result = await pool.query(query, [ID_Usuario]);

        res.status(200).json(result.rows);

    } catch (error) {
        console.error("Error al obtener las notas:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// --- CREAR NUEVA NOTA ---
export const crearNota = async (req, res) => {
    try {
        const { ID_Usuario, Contenido_Nota } = req.body;

        // Validar datos
        if (!ID_Usuario || !Contenido_Nota) {
            return res.status(400).json({ message: "Faltan datos. Se requiere ID_Usuario y Contenido_Nota." });
        }

        const query = `
            INSERT INTO "Notas" ("ID_Usuario", "Contenido_Nota")
            VALUES ($1, $2)
            RETURNING *;
        `;

        const result = await pool.query(query, [ID_Usuario, Contenido_Nota]);

        res.status(201).json({ 
            message: "Nota creada exitosamente.",
            nota: result.rows[0] 
        });

    } catch (error) {
        console.error("Error al crear la nota:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};

// --- ELIMINAR NOTA ---
export const eliminarNota = async (req, res) => {
    try {
        const { ID_Nota } = req.params;

        const query = `
            DELETE FROM "Notas"
            WHERE "ID_Nota" = $1
            RETURNING "ID_Nota";
        `;

        const result = await pool.query(query, [ID_Nota]);

        if (result.rowCount === 0) {
            return res.status(404).json({ message: "No se encontró la nota para eliminar." });
        }

        res.status(200).json({ message: `Nota con ID ${result.rows[0].ID_Nota} eliminada correctamente.` });

    } catch (error) {
        console.error("Error al eliminar la nota:", error);
        res.status(500).json({ message: "Error interno del servidor." });
    }
};