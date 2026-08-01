import "dotenv/config";
import mysql from "mysql2/promise";
import sharp from "sharp";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 75;

async function comprimir(dataUrl) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;

  const buffer = Buffer.from(match[2], "base64");
  const comprimido = await sharp(buffer)
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY })
    .toBuffer();

  return `data:image/jpeg;base64,${comprimido.toString("base64")}`;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "huellitas_solidarias_db",
});

try {
  // Respaldo de las imagenes originales antes de tocarlas: comprimir es una
  // transformacion de un solo sentido (se pierde resolucion/calidad), asi
  // que si el resultado no convence, se puede restaurar exactamente lo que
  // habia antes desde esta tabla.
  await connection.query(`
    CREATE TABLE IF NOT EXISTS mascotas_imagen_backup (
      mascota_id INT UNSIGNED PRIMARY KEY,
      imagen LONGTEXT NOT NULL,
      respaldado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const [rows] = await connection.query(
    "SELECT id, imagen FROM mascotas WHERE imagen IS NOT NULL AND imagen <> ''"
  );

  console.log(`Mascotas con imagen: ${rows.length}`);

  let comprimidas = 0;
  let sinCambio = 0;
  let fallidas = 0;
  let bytesAntes = 0;
  let bytesDespues = 0;

  for (const row of rows) {
    const original = row.imagen;
    bytesAntes += original.length;

    let nueva = null;
    try {
      nueva = await comprimir(original);
    } catch (error) {
      console.error(`Mascota ${row.id}: no se pudo procesar (${error.message})`);
    }

    if (!nueva || nueva.length >= original.length) {
      fallidas += !nueva ? 1 : 0;
      sinCambio += nueva ? 1 : 0;
      bytesDespues += original.length;
      continue;
    }

    // INSERT IGNORE: si el script se corre mas de una vez, no se pisa el
    // respaldo original con una version ya comprimida.
    await connection.query(
      "INSERT IGNORE INTO mascotas_imagen_backup (mascota_id, imagen) VALUES (?, ?)",
      [row.id, original]
    );
    await connection.query("UPDATE mascotas SET imagen = ? WHERE id = ?", [nueva, row.id]);
    bytesDespues += nueva.length;
    comprimidas += 1;
  }

  console.log(`Comprimidas: ${comprimidas}, sin cambio (ya eran pequenas): ${sinCambio}, fallidas: ${fallidas}`);
  console.log(`Peso total antes: ${(bytesAntes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`Peso total despues: ${(bytesDespues / 1024 / 1024).toFixed(2)} MB`);
} finally {
  await connection.end();
}
