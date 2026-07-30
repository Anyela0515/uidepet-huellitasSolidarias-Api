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

/**
 * Migraciones cuyo resultado YA está incluido en db/schema.sql. Se listan una
 * por una a propósito: comparar por nombre no sirve, porque dos migraciones
 * del mismo día se ordenan alfabéticamente y no por el momento en que se
 * plegaron al esquema.
 *
 * Al incorporar una migración nueva dentro de schema.sql, hay que añadirla
 * aquí. Si no está en esta lista, se ejecuta (que es lo correcto para las
 * migraciones que además siembran datos, como la de localidades).
 */
const INCLUIDAS_EN_SCHEMA = new Set([
  "2026_07_19_integridad_y_backend_huellitas.sql",
  "2026_07_21_password_recovery.sql",
  "2026_07_23_ampliar_formulario_adopcion.sql",
  "2026_07_23_seguimiento_mensual.sql",
  "2026_07_24_denuncias_rescate.sql",
  "2026_07_27_documento_fundacion.sql",
  "2026_07_27_forzar_cambio_password.sql",
  "2026_07_28_organizacion_donaciones_y_qr.sql",
  "2026_07_28_organizacion_imagen_perfil.sql",
  "2026_07_29_consolidar_catalogos_simples.sql",
  "2026_07_29_donacion_comprobante.sql",
  "2026_07_29_eliminar_nombre_redundante_estados.sql",
  "2026_07_29_mascota_ubicacion_texto_libre.sql",
  "2026_07_29_mensaje_donacion_id.sql",
  "2026_07_29_verificacion_email.sql",
  "2026_07_29_z1_catalogos_consolidados.sql",
  "2026_07_29_z2_fk_catalogos_redirigidas.sql",
  "2026_07_29_z3_usuarios_perfiles.sql",
  "2026_07_29_z4_mascotas_imagen.sql",
  "2026_07_29_z5_solicitudes_formulario.sql",
  "2026_07_29_z6_archivos_consolidados.sql",
  "2026_07_29_z7_eliminar_configuracion_sitio.sql",
  "2026_07_29_z8_eliminar_catalogos_viejos.sql",
  "2026_07_30_seguimiento_creado_por.sql",
  "2026_07_30_tokens_usuario.sql",
]);

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

  // Baseline: db/schema.sql ya contiene el resultado de todas las migraciones
  // anteriores a la consolidación del esquema, y varias de ellas transforman
  // tablas que ese esquema ya no crea (perfiles_usuario, categorias,
  // medios_mascota...). En una base recién creada con `db:schema` hay que
  // marcarlas como aplicadas en vez de ejecutarlas, o fallarían.
  //
  // Se detecta por dos señales a la vez: no hay ninguna migración registrada
  // Y la tabla `perfiles_usuario` no existe (es decir, el esquema ya nace
  // consolidado). Una base antigua de verdad sí tendría esa tabla.
  if (aplicadas.size === 0) {
    const [legacy] = await connection.query(
      `SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'perfiles_usuario'`
    );

    if (Number(legacy[0].n) === 0) {
      const yaIncluidas = files.filter((f) => INCLUIDAS_EN_SCHEMA.has(f));
      for (const file of yaIncluidas) {
        const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
        await connection.query(
          "INSERT INTO schema_migrations (version, checksum, duracion_ms) VALUES (?, ?, 0)",
          [file, checksumOf(sql)]
        );
        aplicadas.set(file, checksumOf(sql));
      }
      console.log(
        `Base nueva desde schema.sql: ${yaIncluidas.length} migraciones marcadas como incluidas (baseline).`
      );
    }
  }

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
