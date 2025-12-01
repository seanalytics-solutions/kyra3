import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index.js";
import path from "path";
import { fileURLToPath } from "url";
import helmet from "helmet";
import morgan from "morgan"; 

dotenv.config();
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "../uploads");

app.use(morgan("dev"));

app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));

app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

app.use("/api", routes);

app.use('/uploads', express.static(uploadsDir));

app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  console.error("🔥 Error no controlado:", err.stack);
  
  const status = err.status || 500;
  const message = err.message || "Error interno del servidor";

  res.status(status).json({
    success: false,
    message: message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack
  });
});

export default app;