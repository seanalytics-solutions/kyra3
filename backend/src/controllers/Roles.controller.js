import pool from "../config/db.js";

// --- OBTENER TODOS LOS ROLES ---
export const obtenerRoles = async (req, res) => {
  try {
    const query = `
      SELECT 
        "ID_Rol",
        "Rol",
        "Nivel"
      FROM "Roles"
      ORDER BY "Nivel" ASC
    `;

    const { rows } = await pool.query(query);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- CREAR NUEVO ROL ---
export const crearRol = async (req, res) => {
  try {
    const { Rol, Nivel } = req.body;

    if (!Rol || Nivel === undefined) {
      return res.status(400).json({ message: "Se requiere nombre del rol y nivel" });
    }

    const query = `
      INSERT INTO "Roles" ("Rol", "Nivel")
      VALUES ($1, $2)
      RETURNING *
    `;

    const { rows } = await pool.query(query, [Rol, Nivel]);
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- ACTUALIZAR ROL ---
export const actualizarRol = async (req, res) => {
  try {
    const { ID_Rol } = req.params;
    const { Rol, Nivel } = req.body;

    if (!Rol && Nivel === undefined) {
      return res.status(400).json({ message: "Se requiere al menos un campo para actualizar" });
    }

    let query = 'UPDATE "Roles" SET ';
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (Rol) {
      updates.push(`"Rol" = $${paramIndex++}`);
      values.push(Rol);
    }
    if (Nivel !== undefined) {
      updates.push(`"Nivel" = $${paramIndex++}`);
      values.push(Nivel);
    }

    query += updates.join(", ");
    query += ` WHERE "ID_Rol" = $${paramIndex} RETURNING *`;
    values.push(ID_Rol);

    const { rows, rowCount } = await pool.query(query, values);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};

// --- ELIMINAR ROL ---
export const eliminarRol = async (req, res) => {
  try {
    const { ID_Rol } = req.params;

    // Verificar si el rol está en uso antes de eliminar
    const usageCheck = await pool.query('SELECT COUNT(*) as count FROM "Usuarios" WHERE "ID_Rol" = $1', [ID_Rol]);

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(409).json({ message: "No se puede eliminar un rol que está en uso" });
    }

    const query = 'DELETE FROM "Roles" WHERE "ID_Rol" = $1 RETURNING *';
    const { rows, rowCount } = await pool.query(query, [ID_Rol]);

    if (rowCount === 0) {
      return res.status(404).json({ message: "Rol no encontrado" });
    }

    res.status(200).json({ message: "Rol eliminado correctamente", role: rows[0] });
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};