import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const PASSWORD = "Huellitas123";
const PLACEHOLDER_IMG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

const pool = mysql.createPool({
  host: process.env.DB_HOST ?? "localhost",
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER ?? "root",
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_NAME ?? "huellitas_solidarias_db",
  multipleStatements: false,
});

async function idByTipoCodigo(conn, tipo, codigo) {
  const [rows] = await conn.query(
    "SELECT id FROM catalogos WHERE tipo = ? AND codigo = ? LIMIT 1",
    [tipo, codigo]
  );
  return rows[0].id;
}

async function idByTipoNombre(conn, tipo, nombre) {
  const [rows] = await conn.query(
    "SELECT id FROM catalogos WHERE tipo = ? AND nombre = ? LIMIT 1",
    [tipo, nombre]
  );
  return rows[0].id;
}

/** Resuelve una parroquia por su ruta provincia > cantón > parroquia. */
async function idPorRuta(conn, provincia, canton, parroquia) {
  const [rows] = await conn.query(
    `SELECT par.id
       FROM catalogos par
       INNER JOIN catalogos cant ON cant.id = par.padre_id AND cant.tipo = 'canton'
       INNER JOIN catalogos prov ON prov.id = cant.padre_id AND prov.tipo = 'provincia'
      WHERE par.tipo = 'parroquia'
        AND par.nombre = ? AND cant.nombre = ? AND prov.nombre = ?
      LIMIT 1`,
    [parroquia, canton, provincia]
  );
  return rows[0].id;
}

async function ensureRaza(conn, especieNombre, razaNombre) {
  const especieId = await idByTipoNombre(conn, "especie", especieNombre);
  const [rows] = await conn.query(
    "SELECT id FROM catalogos WHERE tipo = 'raza' AND padre_id = ? AND nombre = ? LIMIT 1",
    [especieId, razaNombre]
  );
  if (rows[0]) return rows[0].id;
  const [result] = await conn.query(
    "INSERT INTO catalogos (tipo, padre_id, nombre) VALUES ('raza', ?, ?)",
    [especieId, razaNombre]
  );
  return result.insertId;
}

async function seed() {
  const hash = await bcrypt.hash(PASSWORD, 12);
  const conn = await pool.getConnection();

  try {
    await conn.query("SET FOREIGN_KEY_CHECKS = 0");
    const tables = [
      "archivos",
      "seguimientos_adopcion",
      "solicitudes_adopcion",
      "favoritos",
      "mensajes",
      "donaciones",
      "denuncias_rescate",
      "mascota_tag",
      "mascotas",
      "solicitudes_registro_organizacion",
      "organizaciones",
      "tokens_usuario",
      "usuarios",
    ];
    for (const table of tables) {
      await conn.query(`TRUNCATE TABLE ${table}`);
    }
    await conn.query("SET FOREIGN_KEY_CHECKS = 1");

    const rolAdmin = await idByTipoCodigo(conn, "rol", "admin");
    const rolFund = await idByTipoCodigo(conn, "rol", "fundacion");
    const rolUser = await idByTipoCodigo(conn, "rol", "usuario");
    const estadoActivo = await idByTipoCodigo(conn, "estado_cuenta", "Activo");
    // Parroquia Sucre, cantón Loja, provincia Loja. Hay que resolver la ruta
    // completa: varios cantones del país tienen una parroquia llamada SUCRE,
    // así que buscar solo por nombre devolvería la de otra provincia.
    const localidadLoja = await idPorRuta(conn, "LOJA", "LOJA", "SUCRE");
    const sexoHembra = await idByTipoNombre(conn, "sexo", "Hembra");
    const sexoMacho = await idByTipoNombre(conn, "sexo", "Macho");
    const tamPeq = await idByTipoNombre(conn, "tamano", "Pequeño");
    const tamMed = await idByTipoNombre(conn, "tamano", "Mediano");
    const tamGran = await idByTipoNombre(conn, "tamano", "Grande");
    const unidadAnios = await idByTipoNombre(conn, "unidad_edad", "Años");
    const unidadMeses = await idByTipoNombre(conn, "unidad_edad", "Meses");
    const estDisp = await idByTipoCodigo(conn, "estado_mascota", "Disponible");
    const estProceso = await idByTipoCodigo(conn, "estado_mascota", "En proceso");
    const estSolRev = await idByTipoCodigo(conn, "estado_solicitud_adopcion", "revision");
    const estOrgPend = await idByTipoCodigo(conn, "estado_solicitud_organizacion", "pendiente");
    const tipoAlimento = await idByTipoNombre(conn, "tipo_donacion", "Alimento");
    const estDonOk = await idByTipoCodigo(conn, "estado_donacion", "Completado");
    const viviendaCasa = await idByTipoNombre(conn, "tipo_vivienda", "Casa");

    const razaPerro = await ensureRaza(conn, "Perro", "Mestizo");
    const razaGato = await ensureRaza(conn, "Gato", "Mestizo");

    const users = [
      {
        correo: "admin@huellitas.com",
        rol: rolAdmin,
        perfil: [
          "Administrador UIDE",
          "1100110011",
          "0990001122",
          "Campus UIDE Quito",
        ],
      },
      {
        correo: "fundacion@huellitas.com",
        rol: rolFund,
        perfil: [
          "Fundación Huellitas",
          "1100220033",
          "0998887766",
          "Av. Universitaria y Lourdes, Loja",
        ],
        org: true,
      },
      {
        correo: "maria.torres@correo.com",
        rol: rolUser,
        perfil: [
          "María Fernanda Torres",
          "1103567890",
          "0991234567",
          "Barrio Central, Loja",
        ],
      },
      {
        correo: "dilan.galvez@correo.com",
        rol: rolUser,
        perfil: [
          "Dilan Gálvez",
          "1104678901",
          "0987654321",
          "San Sebastián, Loja",
        ],
      },
    ];

    const userIds = {};
    for (const u of users) {
      const [nombre, cedula, telefono, direccion] = u.perfil;
      const [result] = await conn.query(
        `INSERT INTO usuarios (correo, password_hash, nombre, cedula, telefono, direccion, rol_id, estado_cuenta_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [u.correo, hash, nombre, cedula, telefono, direccion, u.rol, estadoActivo]
      );
      userIds[u.correo] = result.insertId;
    }

    const [orgResult] = await conn.query(
      `INSERT INTO organizaciones
        (nombre, ruc, telefono, localidad_id, descripcion, direccion, usuario_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        "Fundación Huellitas",
        "1790012345001",
        "0998887766",
        localidadLoja,
        "Fundación de adopción responsable vinculada a UIDE.",
        "Av. Universitaria y Lourdes, Loja",
        userIds["fundacion@huellitas.com"],
      ]
    );
    const orgId = orgResult.insertId;

    const mascotas = [
      ["Luna", razaPerro, 1, unidadAnios, sexoHembra, tamMed, estDisp],
      ["Max", razaPerro, 2, unidadAnios, sexoMacho, tamGran, estDisp],
      ["Mía", razaGato, 10, unidadMeses, sexoHembra, tamPeq, estDisp],
      ["Rocky", razaPerro, 3, unidadAnios, sexoMacho, tamGran, estProceso],
      ["Nala", razaPerro, 1, unidadAnios, sexoHembra, tamMed, estDisp],
    ];

    const historias = {
      Luna: [
        "Cariñosa, tranquila y acostumbrada a convivir con personas.",
        "Hogar con patio y compromiso de esterilización.",
        ["Vacunada", "Esterilizada"],
      ],
      Max: [
        "Activo, juguetón y protector. Ideal para casa con patio.",
        "Experiencia previa con perros grandes.",
        ["Vacunado", "Esterilizado"],
      ],
      Mía: [
        "Gatita dócil, limpia y muy sociable.",
        "Hogar tranquilo, ideal departamento.",
        ["Vacunada"],
      ],
      Rocky: [
        "Perro rescatado, noble y obediente.",
        "Familia responsable con espacio amplio.",
        ["Vacunado", "Esterilizado"],
      ],
      Nala: [
        "Le gusta caminar y convivir con niños.",
        "Paseos diarios y seguimiento post-adopción.",
        ["Vacunada", "Esterilizada"],
      ],
    };

    const petIds = {};
    for (const [nombre, razaId, edad, unidad, sexo, tamano, estado] of mascotas) {
      const [meta, requisitos, tags] = historias[nombre];
      const [result] = await conn.query(
        `INSERT INTO mascotas
          (nombre, raza_id, edad_valor, unidad_edad_id, sexo_id, tamano_id, ubicacion,
           historia, requisitos, imagen, organizacion_id, estado_mascota_id, oculto)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          nombre,
          razaId,
          edad,
          unidad,
          sexo,
          tamano,
          "Loja",
          meta,
          requisitos,
          PLACEHOLDER_IMG,
          orgId,
          estado,
        ]
      );
      petIds[nombre] = result.insertId;

      for (const tagNombre of tags) {
        const tagId = await idByTipoNombre(conn, "tag", tagNombre);
        await conn.query(
          "INSERT INTO mascota_tag (mascota_id, tag_id) VALUES (?, ?)",
          [result.insertId, tagId]
        );
      }
    }

    await conn.query(
      "INSERT INTO favoritos (usuario_id, mascota_id) VALUES (?, ?), (?, ?)",
      [
        userIds["maria.torres@correo.com"],
        petIds.Luna,
        userIds["maria.torres@correo.com"],
        petIds.Mía,
      ]
    );

    const now = new Date();
    const solicitudId = `ADOP-${now.getFullYear()}-${now.getTime()}`;

    await conn.query(
      `INSERT INTO solicitudes_adopcion
        (id, mascota_id, adoptante_id, organizacion_id, estado_id, observaciones, proximo_paso,
         nombre_declarado, cedula_declarada, telefono_declarado, correo_declarado,
         direccion_declarada, localidad_id, tipo_vivienda_id, personas_hogar, acuerdo_hogar,
         permanencia_animal, lugar_dormir, tiene_mascotas, responsable_cuidado,
         responsable_gastos, acepta_seguimiento, acepta_contrato, declaracion_veracidad)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        solicitudId,
        petIds.Rocky,
        userIds["maria.torres@correo.com"],
        orgId,
        estSolRev,
        "Tu solicitud fue recibida. El equipo está revisando tu información.",
        "Espera la respuesta de la fundación en un plazo máximo de 48 horas.",
        "María Fernanda Torres",
        "1103567890",
        "0991234567",
        "maria.torres@correo.com",
        "Barrio Central, Loja",
        localidadLoja,
        viviendaCasa,
        "3",
        "si",
        "si",
        "Interior",
        "no",
        "María Fernanda Torres",
        "María Fernanda Torres",
        "si",
        "si",
        1,
      ]
    );

    await conn.query(
      `INSERT INTO solicitudes_registro_organizacion
        (id, nombre_organizacion, ruc, nombre_representante, correo, telefono,
         localidad_id, descripcion, nombre_documento, estado_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `FUND-${Date.now()}-demo`,
        "Refugio Patitas Loja",
        "1190012345002",
        "Ana Pérez",
        "patitasloja@correo.com",
        "0987776655",
        localidadLoja,
        "Organización sin fines de lucro dedicada al rescate animal.",
        "estatutos.pdf",
        estOrgPend,
      ]
    );

    await conn.query(
      `INSERT INTO donaciones
        (id, donante_usuario_id, nombre_donante, correo_donante, tipo_donacion_id,
         cantidad_descripcion, direccion, estado_donacion_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `DON-${Date.now()}-1`,
        userIds["maria.torres@correo.com"],
        "María Fernanda Torres",
        "maria.torres@correo.com",
        tipoAlimento,
        "2 sacos de croquetas",
        "Barrio Central, Loja",
        estDonOk,
      ]
    );

    console.log("Seed completado (esquema consolidado).");
    console.log(`Cuentas demo — password: ${PASSWORD}`);
    console.log("  admin@huellitas.com (admin)");
    console.log("  fundacion@huellitas.com (fundacion)");
    console.log("  maria.torres@correo.com (usuario)");
  } finally {
    conn.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
