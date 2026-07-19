import "dotenv/config";
import { createApp } from "./app.js";
import { pool } from "./config/database.js";

function assertEnv() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    console.error(
      "Falta JWT_SECRET (mínimo 32 caracteres). Revisa tu archivo .env"
    );
    process.exit(1);
  }
}

assertEnv();

const PORT = Number(process.env.PORT ?? 3000);
const app = createApp();

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor iniciado en el puerto ${PORT}`);
});

function shutdown(signal: string) {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  server.close(async () => {
    try {
      await pool.end();
      console.log("Pool de MySQL cerrado. Adiós.");
      process.exit(0);
    } catch (error) {
      console.error("Error cerrando el pool de MySQL:", error);
      process.exit(1);
    }
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
