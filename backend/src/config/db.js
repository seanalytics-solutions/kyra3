import pkg from "pg";
const { Pool } = pkg;
import dotenv from "dotenv";

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "manito",
  password: process.env.DB_PASSWORD || "niaaa",
  database: process.env.DB_NAME || "kyra3",
  port: process.env.DB_PORT || 5432,
});

export default pool;
