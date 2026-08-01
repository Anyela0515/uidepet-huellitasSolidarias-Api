import "dotenv/config";
import mysql from "mysql2/promise";

// Restaura las imagenes de mascotas a como estaban antes de correr
// comprimir_imagenes_mascotas.mjs, usando el respaldo que ese script guarda
// en mascotas_imagen_backup.

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "huellitas_solidarias_db",
});

try {
  const [rows] = await connection.query("SELECT mascota_id, imagen FROM mascotas_imagen_backup");
  console.log(`Imagenes respaldadas: ${rows.length}`);

  let restauradas = 0;
  for (const row of rows) {
    const [result] = await connection.query(
      "UPDATE mascotas SET imagen = ? WHERE id = ?",
      [row.imagen, row.mascota_id]
    );
    if (result.affectedRows > 0) restauradas += 1;
  }

  console.log(`Restauradas: ${restauradas}`);
} finally {
  await connection.end();
}
