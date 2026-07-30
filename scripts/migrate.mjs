import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import mysql from "mysql2/promise";

const migrationsDir = path.resolve("db", "migrations");
const files = (await fs.readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "huellitas_solidarias_db",
  multipleStatements: true,
});

function checksumOf(sql) {
  return crypto.createHash("sha256").update(sql).digest("hex");
}

try {
  // Registra qué migraciones ya se aplicaron (y con qué contenido), para no
  // volver a ejecutar el archivo completo cada vez que corre `db:migrate`.
  // Antes de esto, el runner re-ejecutaba TODOS los archivos siempre; como
  // ninguno estaba obligado a seguir siendo idempotente contra el estado
  // FINAL de migraciones posteriores, una migración nueva pudo romper la
  // re-ejecución de una vieja (nos pasó con 2026_07_24_denuncias_rescate.sql
  // tras 2026_07_29_eliminar_nombre_redundante_estados.sql).
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      duracion_ms INT UNSIGNED NULL
    )
  `);

  const [rows] = await connection.query(
    "SELECT version, checksum FROM schema_migrations"
  );
  const aplicadas = new Map(rows.map((row) => [row.version, row.checksum]));

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    const checksum = checksumOf(sql);
    const previaChecksum = aplicadas.get(file);

    if (previaChecksum) {
      if (previaChecksum !== checksum) {
        throw new Error(
          `La migración "${file}" ya se aplicó antes con otro contenido (checksum distinto). ` +
            "No se debe editar una migración ya aplicada; crea un archivo nuevo en su lugar."
        );
      }
      console.log(`Migración ya aplicada, se omite: ${file}`);
      continue;
    }

    const inicio = Date.now();
    await connection.query(sql);
    const duracionMs = Date.now() - inicio;

    await connection.query(
      "INSERT INTO schema_migrations (version, checksum, duracion_ms) VALUES (?, ?, ?)",
      [file, checksum, duracionMs]
    );
    console.log(`Migración aplicada: ${file} (${duracionMs}ms)`);
  }
} finally {
  await connection.end();
}
