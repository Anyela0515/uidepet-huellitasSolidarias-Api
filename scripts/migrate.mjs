import "dotenv/config";
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

try {
  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    await connection.query(sql);
    console.log(`Migración aplicada: ${file}`);
  }
} finally {
  await connection.end();
}
