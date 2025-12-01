import pool from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// --- LOGIN SEGURO ---
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email y contraseña son requeridos" });
    }

    const query = `
      SELECT "ID_Usuario", "Nombre_Usuario", "Correo", "ID_Rol", "Contrasena", "Color"
      FROM "Usuarios" 
      WHERE "Correo" = $1
    `;
    const { rows } = await pool.query(query, [email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioEncontrado = rows[0];
    
    // Comparar hash
    const esValida = await bcrypt.compare(password, usuarioEncontrado.Contrasena);

    if (!esValida) {
      return res.status(401).json({ message: "Contraseña incorrecta" });
    }

    // Generar Token
    const token = jwt.sign(
      { 
        id: usuarioEncontrado.ID_Usuario, 
        email: usuarioEncontrado.Correo,
        rol: usuarioEncontrado.ID_Rol 
      },
      process.env.JWT_SECRET || "secreto_temporal",
      { expiresIn: "12h" }
    );

    res.status(200).json({
      id: usuarioEncontrado.ID_Usuario,
      email: usuarioEncontrado.Correo,
      nombre: usuarioEncontrado.Nombre_Usuario,
      ID_Rol: usuarioEncontrado.ID_Rol,
      color: usuarioEncontrado.Color,
      token: token,
    });
  } catch (error) {
    console.error("Error en login:", error);
    res.status(500).json({ message: "Error interno del servidor." });
  }
};

// --- REGISTRO DE USUARIO ---
export const registro = async (req, res) => {
  try {
    const { Nombre_Usuario, Correo, Contrasena, ID_Rol } = req.body;

    if (!Nombre_Usuario || !Correo || !Contrasena) {
      return res.status(400).json({ message: "Faltan datos obligatorios." });
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(Contrasena, 10);

    const query = `
      INSERT INTO "Usuarios" ("Nombre_Usuario", "Correo", "Contrasena", "ID_Rol")
      VALUES ($1, $2, $3, $4)
      RETURNING "ID_Usuario", "Nombre_Usuario", "Correo";
    `;
    
    const { rows } = await pool.query(query, [Nombre_Usuario, Correo, hashedPassword, ID_Rol || 2]);

    res.status(201).json({ message: "Usuario creado exitosamente", usuario: rows[0] });
  } catch (error) {
    console.error("Error en registro:", error);
    res.status(500).json({ message: "Error al registrar usuario." });
  }
};

// --- OBTENER TODOS (con filtros) ---
export const obtenerTodos = async (req, res) => {
  try {
    const { search, exclude } = req.query;
    let query = `SELECT "ID_Usuario", "Nombre_Usuario", "Correo", "Color", "ID_Rol", "Fecha_Creacion" FROM "Usuarios" `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`"Nombre_Usuario" ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }

    if (exclude) {
      conditions.push(`"ID_Usuario" != $${params.length + 1}`);
      params.push(exclude);
    }

    if (conditions.length > 0) {
      query += `WHERE ${conditions.join(" AND ")}`;
    }

    query += ` ORDER BY "Nombre_Usuario" ASC;`;

    const { rows } = await pool.query(query, params);

    // Si es admin panel (pide JSON puro), devuelve rows. Si no, mapea.
    if (req.headers.accept === "application/json-admin") {
      res.status(200).json(rows);
    } else {
      const usuariosMapeados = rows.map((row) => ({
        id: row.ID_Usuario,
        nombre: row.Nombre_Usuario,
        color: row.Color,
        correo: row.Correo,
        // Mantener compatibilidad con ambos formatos por si acaso
        ID_Usuario: row.ID_Usuario,
        Nombre_Usuario: row.Nombre_Usuario
      }));
      res.status(200).json(usuariosMapeados);
    }
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error interno." });
  }
};

// --- OBTENER POR ID ---
export const obtenerPorId = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT 
        "ID_Usuario" as id,
        "Nombre_Usuario" as nombre,
        "Correo" as correo,
        "Color" as color,
        "ID_Rol" as rol
      FROM "Usuarios"
      WHERE "ID_Usuario" = $1
    `;
    const { rows } = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error interno" });
  }
};

// --- OBTENER MIEMBROS DE EQUIPO ---
export const obtenerPorEquipo = async (req, res) => {
  try {
    const { ID_Equipo } = req.params;
    const query = `
      SELECT 
        u."ID_Usuario",
        u."Nombre_Usuario",
        u."Correo",
        u."Color",
        me."Rol_equipo"
      FROM "Usuarios" u
      JOIN "MiembrosEquipos" me ON u."ID_Usuario" = me."ID_Usuario"
      WHERE me."ID_Equipo" = $1
      ORDER BY u."Nombre_Usuario" ASC;
    `;
    const { rows } = await pool.query(query, [ID_Equipo]);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener miembros:", error);
    res.status(500).json({ message: "Error interno." });
  }
};

// --- ACTUALIZAR USUARIO ---
export const actualizarUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const { Nombre_Usuario, Correo, ID_Rol, Contraseña, Color } = req.body;

    const updateFields = [];
    const params = [];
    let paramCount = 1;

    if (Nombre_Usuario !== undefined) {
      updateFields.push(`"Nombre_Usuario" = $${paramCount++}`);
      params.push(Nombre_Usuario);
    }
    if (Correo !== undefined) {
      updateFields.push(`"Correo" = $${paramCount++}`);
      params.push(Correo);
    }
    if (ID_Rol !== undefined) {
      updateFields.push(`"ID_Rol" = $${paramCount++}`);
      params.push(ID_Rol);
    }
    if (Color !== undefined) {
      updateFields.push(`"Color" = $${paramCount++}`);
      params.push(Color);
    }

    // Encriptar contraseña si se envía una nueva
    if (Contraseña !== undefined && Contraseña !== "") {
      const hashedPassword = await bcrypt.hash(Contraseña, 10);
      updateFields.push(`"Contrasena" = $${paramCount++}`);
      params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    params.push(id);
    const query = `
      UPDATE "Usuarios"
      SET ${updateFields.join(", ")}
      WHERE "ID_Usuario" = $${paramCount}
      RETURNING "ID_Usuario", "Nombre_Usuario", "Correo", "ID_Rol", "Color", "Fecha_Creacion"
    `;

    const { rows } = await pool.query(query, params);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
};