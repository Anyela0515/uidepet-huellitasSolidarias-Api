-- Huellitas Solidarias — esquema relacional en 3FN
-- Sin datos derivados ni snapshots denormalizados (salvo los campos
-- "declarados" del formulario de adopción, que son una foto intencional del
-- momento en que se aplicó, no un derivado del perfil actual).
-- El API ensambla el contrato camelCase del frontend vía JOINs + mappers.

DROP DATABASE IF EXISTS huellitas_solidarias_db;

CREATE DATABASE huellitas_solidarias_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas_solidarias_db;

-- =============================================================================
-- CONTROL DE MIGRACIONES
-- =============================================================================
-- Registra qué migraciones de db/migrations/ ya se aplicaron (y con qué
-- contenido, vía checksum), para que scripts/migrate.mjs no las re-ejecute
-- cada vez que corre.

CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  checksum CHAR(64) NOT NULL,
  aplicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duracion_ms INT UNSIGNED NULL
);

-- =============================================================================
-- CATÁLOGOS
-- =============================================================================

-- Catálogo único para todo dato de referencia de la app: roles, estados de
-- cada dominio (cuenta, mascota, solicitud de adopción, solicitud de
-- organización, donación, denuncia), tipo de medio, y los atributos de
-- mascota (especie/raza/sexo/tamaño/unidad_edad) y listas simples
-- (ciudad/tag/tipo_vivienda/tipo_donacion) que antes vivían en `categorias`
-- y `catalogos` por separado. `tipo` distingue el dominio; `codigo` es el
-- valor real para los catálogos que antes solo tenían código (nunca se leía
-- un nombre distinto); `nombre` es el valor real para los que sí tienen
-- texto propio. `padre_id` solo se usa en 'raza' (apunta a su propia
-- 'especie', otra fila de esta misma tabla).
CREATE TABLE catalogos (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(32) NOT NULL,
  codigo VARCHAR(30) NULL,
  nombre VARCHAR(80) NULL,
  padre_id SMALLINT UNSIGNED NULL,
  padre_id_uniq SMALLINT UNSIGNED GENERATED ALWAYS AS (COALESCE(padre_id, 0)) STORED,
  UNIQUE KEY uq_catalogo_tipo_codigo (tipo, codigo),
  UNIQUE KEY uq_catalogo_tipo_padre_nombre (tipo, padre_id_uniq, nombre),
  CONSTRAINT chk_catalogo_tipo CHECK (tipo IN (
    'rol','estado_cuenta','estado_mascota','estado_solicitud_adopcion',
    'estado_solicitud_organizacion','estado_donacion','tipo_medio','estado_denuncia',
    'especie','raza','sexo','tamano','unidad_edad',
    'ciudad','tag','tipo_vivienda','tipo_donacion'
  )),
  CONSTRAINT chk_catalogo_raza_padre CHECK (
    (tipo = 'raza' AND padre_id IS NOT NULL) OR (tipo <> 'raza' AND padre_id IS NULL)
  ),
  CONSTRAINT fk_catalogo_padre
    FOREIGN KEY (padre_id) REFERENCES catalogos(id)
);

-- =============================================================================
-- USUARIOS / ORGANIZACIONES
-- =============================================================================

-- Fusiona lo que antes era usuarios + perfiles_usuario: la fila de perfil
-- nunca tenía ciclo de vida propio (se crea siempre junto con la cuenta, en
-- la misma transacción), así que separarla en otra tabla no aportaba nada.
CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  cedula VARCHAR(10) NULL,
  telefono VARCHAR(20),
  direccion VARCHAR(255),
  rol_id SMALLINT UNSIGNED NOT NULL,
  estado_cuenta_id SMALLINT UNSIGNED NOT NULL,
  debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0,
  -- DEFAULT 1 a propósito: solo el autoregistro público de adoptantes exige
  -- verificación (se inserta explícitamente en 0 ahí); cuentas creadas por
  -- un admin, fundaciones, y logins de Google (que ya vienen con el correo
  -- verificado por Google) quedan verificadas desde el inicio.
  email_verificado TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_usuarios_cedula (cedula),
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (rol_id) REFERENCES catalogos(id),
  CONSTRAINT fk_usuario_estado
    FOREIGN KEY (estado_cuenta_id) REFERENCES catalogos(id)
);

-- Unifica password_reset_tokens y email_verification_tokens: mismo shape
-- exacto (token de un solo uso ligado a un usuario), solo cambia el
-- propósito. `tipo` distingue para qué es cada token.
CREATE TABLE tokens_usuario (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  tipo ENUM('recuperacion_password', 'verificacion_email') NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tokens_usuario_tipo (usuario_id, tipo),
  INDEX idx_tokens_expires (expires_at),
  CONSTRAINT fk_tokens_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE organizaciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  ruc VARCHAR(13) UNIQUE,
  telefono VARCHAR(20),
  ciudad_id SMALLINT UNSIGNED,
  descripcion TEXT,
  direccion VARCHAR(255),
  usuario_id INT UNSIGNED NOT NULL UNIQUE,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  imagen_qr LONGTEXT NULL,
  imagen LONGTEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES catalogos(id),
  CONSTRAINT fk_org_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT chk_organizaciones_activo CHECK (activo IN (0, 1))
);

-- Vida propia distinta de `organizaciones`: es una solicitud pendiente sin
-- cuenta todavía (puede rechazarse y no dejar ningún rastro en usuarios),
-- mientras que `organizaciones` siempre está ligada a una cuenta ya activa.
CREATE TABLE solicitudes_registro_organizacion (
  id VARCHAR(50) PRIMARY KEY,
  nombre_organizacion VARCHAR(150) NOT NULL,
  ruc VARCHAR(13) NOT NULL,
  nombre_representante VARCHAR(120) NOT NULL,
  correo VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  ciudad_id SMALLINT UNSIGNED NOT NULL,
  descripcion TEXT NOT NULL,
  nombre_documento VARCHAR(255),
  documento_contenido LONGTEXT NULL,
  estado_id SMALLINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sol_org_correo (correo),
  UNIQUE KEY uq_sol_org_ruc (ruc),
  CONSTRAINT fk_sol_org_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES catalogos(id),
  CONSTRAINT fk_sol_org_estado
    FOREIGN KEY (estado_id) REFERENCES catalogos(id)
);

-- =============================================================================
-- MASCOTAS
-- =============================================================================

-- Incluye `imagen` directo (antes vivía en medios_mascota, una tabla de
-- galería multi-foto que el frontend nunca llegó a usar: siempre hay como
-- máximo una imagen principal por mascota).
CREATE TABLE mascotas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  raza_id SMALLINT UNSIGNED NOT NULL,
  edad_valor SMALLINT UNSIGNED NOT NULL,
  unidad_edad_id SMALLINT UNSIGNED NOT NULL,
  sexo_id SMALLINT UNSIGNED NOT NULL,
  tamano_id SMALLINT UNSIGNED NOT NULL,
  -- Texto libre (ej. "Ciudadela del Arquitecto"): es la ubicación específica
  -- de la mascota, no una ciudad de una lista cerrada, por eso NO es un FK
  -- al catálogo de ciudades (a diferencia de organizaciones/solicitudes de
  -- adopción, que sí usan una ciudad de lista fija).
  ubicacion VARCHAR(255) NOT NULL,
  historia TEXT NOT NULL,
  requisitos TEXT NOT NULL,
  imagen LONGTEXT NULL,
  organizacion_id INT UNSIGNED NOT NULL,
  estado_mascota_id SMALLINT UNSIGNED NOT NULL,
  publicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  oculto TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_mascota_raza
    FOREIGN KEY (raza_id) REFERENCES catalogos(id),
  CONSTRAINT fk_mascota_unidad_edad
    FOREIGN KEY (unidad_edad_id) REFERENCES catalogos(id),
  CONSTRAINT fk_mascota_sexo
    FOREIGN KEY (sexo_id) REFERENCES catalogos(id),
  CONSTRAINT fk_mascota_tamano
    FOREIGN KEY (tamano_id) REFERENCES catalogos(id),
  CONSTRAINT fk_mascota_org
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  CONSTRAINT fk_mascota_estado
    FOREIGN KEY (estado_mascota_id) REFERENCES catalogos(id),
  INDEX idx_mascotas_estado (estado_mascota_id),
  INDEX idx_mascotas_org (organizacion_id)
);

CREATE TABLE mascota_tag (
  mascota_id INT UNSIGNED NOT NULL,
  tag_id SMALLINT UNSIGNED NOT NULL,
  PRIMARY KEY (mascota_id, tag_id),
  CONSTRAINT fk_mt_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE,
  CONSTRAINT fk_mt_tag
    FOREIGN KEY (tag_id) REFERENCES catalogos(id)
);

-- =============================================================================
-- ADOPCIONES
-- =============================================================================

-- Incluye los campos "declarados" del formulario (antes en
-- formularios_adopcion): se crean siempre junto con la solicitud, en la
-- misma transacción, y nunca hay una solicitud sin su formulario. Se
-- mantienen como columnas propias (no derivadas de usuarios) porque son una
-- foto del momento en que se aplicó: el perfil del adoptante puede cambiar
-- después sin que eso deba alterar lo que declaró en su momento.
CREATE TABLE solicitudes_adopcion (
  id VARCHAR(50) PRIMARY KEY,
  mascota_id INT UNSIGNED NOT NULL,
  adoptante_id INT UNSIGNED NOT NULL,
  organizacion_id INT UNSIGNED NOT NULL,
  estado_id SMALLINT UNSIGNED NOT NULL,
  observaciones TEXT,
  proximo_paso TEXT,

  nombre_declarado VARCHAR(120) NOT NULL,
  cedula_declarada VARCHAR(10) NOT NULL,
  telefono_declarado VARCHAR(20) NOT NULL,
  correo_declarado VARCHAR(150) NOT NULL,
  direccion_declarada VARCHAR(255) NOT NULL,
  ciudad_id SMALLINT UNSIGNED NOT NULL,
  tipo_vivienda_id SMALLINT UNSIGNED NOT NULL,
  personas_hogar VARCHAR(20) NOT NULL,
  acuerdo_hogar VARCHAR(10) NOT NULL,
  -- Descripción libre (el formulario del frontend usa un textarea, no un
  -- selector corto), por eso necesita más que un par de palabras tipo "si/no".
  permanencia_animal VARCHAR(255) NOT NULL,
  lugar_dormir VARCHAR(255) NOT NULL,
  tiene_mascotas VARCHAR(10) NOT NULL,
  cantidad_mascotas VARCHAR(20),
  tipos_mascotas VARCHAR(150),
  vacunas VARCHAR(20),
  esterilizacion VARCHAR(20),
  responsable_cuidado VARCHAR(120) NOT NULL,
  responsable_gastos VARCHAR(120) NOT NULL,
  acepta_seguimiento VARCHAR(10) NOT NULL,
  acepta_contrato VARCHAR(10) NOT NULL,
  declaracion_veracidad TINYINT(1) NOT NULL DEFAULT 0,

  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sol_adop_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id),
  CONSTRAINT fk_sol_adop_adoptante
    FOREIGN KEY (adoptante_id) REFERENCES usuarios(id),
  CONSTRAINT fk_sol_adop_org
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  CONSTRAINT fk_sol_adop_estado
    FOREIGN KEY (estado_id) REFERENCES catalogos(id),
  CONSTRAINT fk_sol_adop_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES catalogos(id),
  CONSTRAINT fk_sol_adop_vivienda
    FOREIGN KEY (tipo_vivienda_id) REFERENCES catalogos(id),
  INDEX idx_sol_adop_mascota (mascota_id),
  INDEX idx_sol_adop_adoptante (adoptante_id),
  INDEX idx_sol_adop_org (organizacion_id)
);

CREATE TABLE seguimientos_adopcion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id VARCHAR(50) NOT NULL,
  periodo CHAR(7) NOT NULL,
  comentario TEXT NOT NULL,
  -- Quién escribió el seguimiento (el adoptante). NULL solo en filas
  -- históricas creadas antes de que existiera esta columna.
  creado_por INT UNSIGNED NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seg_solicitud_periodo (solicitud_id, periodo),
  CONSTRAINT fk_seg_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE,
  CONSTRAINT fk_seg_creado_por
    FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

-- Reemplaza evidencias_adopcion + archivos_seguimiento + evidencias_denuncia:
-- las 3 tenían el mismo shape (archivo adjunto a un dueño). El CHECK obliga
-- a que exactamente una de las 3 FKs esté llena, así se mantiene integridad
-- referencial real (a diferencia de una FK polimórfica sin constraint).
CREATE TABLE archivos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id VARCHAR(50) NULL,
  seguimiento_id INT UNSIGNED NULL,
  denuncia_id VARCHAR(50) NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  tamanio_bytes INT UNSIGNED,
  contenido LONGTEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_archivo_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE,
  CONSTRAINT fk_archivo_seguimiento
    FOREIGN KEY (seguimiento_id) REFERENCES seguimientos_adopcion(id) ON DELETE CASCADE,
  CONSTRAINT fk_archivo_denuncia
    FOREIGN KEY (denuncia_id) REFERENCES denuncias_rescate(id) ON DELETE CASCADE,
  CONSTRAINT chk_archivo_un_dueno CHECK (
    (solicitud_id IS NOT NULL) + (seguimiento_id IS NOT NULL) + (denuncia_id IS NOT NULL) = 1
  ),
  INDEX idx_archivo_solicitud (solicitud_id),
  INDEX idx_archivo_seguimiento (seguimiento_id),
  INDEX idx_archivo_denuncia (denuncia_id)
);

-- =============================================================================
-- FAVORITOS / MENSAJES / DONACIONES
-- =============================================================================

CREATE TABLE favoritos (
  usuario_id INT UNSIGNED NOT NULL,
  mascota_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, mascota_id),
  CONSTRAINT fk_fav_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_fav_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE
);

CREATE TABLE mensajes (
  id VARCHAR(50) PRIMARY KEY,
  nombre_remitente VARCHAR(120) NOT NULL,
  correo_remitente VARCHAR(150) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  cuerpo TEXT NOT NULL,
  solicitud_id VARCHAR(50),
  -- FK a donaciones se agrega más abajo con ALTER TABLE porque esa tabla
  -- todavía no existe en este punto del archivo.
  donacion_id VARCHAR(50),
  organizacion_id INT UNSIGNED,
  leido TINYINT(1) NOT NULL DEFAULT 0,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_msg_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE SET NULL,
  CONSTRAINT fk_msg_org
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE SET NULL,
  INDEX idx_mensajes_org (organizacion_id)
);

CREATE TABLE donaciones (
  id VARCHAR(50) PRIMARY KEY,
  donante_usuario_id INT UNSIGNED,
  nombre_donante VARCHAR(120) NOT NULL,
  correo_donante VARCHAR(150) NOT NULL,
  tipo_donacion_id SMALLINT UNSIGNED NOT NULL,
  cantidad_descripcion VARCHAR(120) NOT NULL,
  direccion VARCHAR(255),
  organizacion_id INT UNSIGNED NULL,
  estado_donacion_id SMALLINT UNSIGNED NOT NULL,
  comprobante_pago LONGTEXT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_don_usuario
    FOREIGN KEY (donante_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_don_tipo
    FOREIGN KEY (tipo_donacion_id) REFERENCES catalogos(id),
  CONSTRAINT fk_don_estado
    FOREIGN KEY (estado_donacion_id) REFERENCES catalogos(id),
  CONSTRAINT fk_don_organizacion
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE SET NULL,
  INDEX idx_donaciones_organizacion (organizacion_id)
);

ALTER TABLE mensajes
  ADD CONSTRAINT fk_msg_donacion
    FOREIGN KEY (donacion_id) REFERENCES donaciones(id) ON DELETE SET NULL;

-- =============================================================================
-- REPORTES DE RESCATE (denuncias ciudadanas de animales heridos/abandonados)
-- =============================================================================

-- Formulario público de "Reportar rescate" del frontend: no requiere cuenta,
-- el contacto es opcional para permitir reportes anónimos.
CREATE TABLE denuncias_rescate (
  id VARCHAR(50) PRIMARY KEY,
  tipo_animal VARCHAR(30) NOT NULL,
  urgencia VARCHAR(20) NOT NULL,
  ubicacion VARCHAR(255) NOT NULL,
  referencia VARCHAR(255),
  latitud DECIMAL(10,8) NULL,
  longitud DECIMAL(11,8) NULL,
  descripcion TEXT NOT NULL,
  nombre_contacto VARCHAR(120),
  contacto VARCHAR(150),
  estado_id SMALLINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_denuncia_estado
    FOREIGN KEY (estado_id) REFERENCES catalogos(id),
  INDEX idx_denuncia_estado (estado_id)
);

-- =============================================================================
-- DATOS INICIALES DE CATÁLOGO
-- =============================================================================

INSERT INTO catalogos (tipo, codigo) VALUES
  ('rol', 'usuario'), ('rol', 'fundacion'), ('rol', 'admin');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_cuenta', 'Activo'), ('estado_cuenta', 'Suspendido');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('especie', 'Perro'), ('especie', 'Gato'), ('especie', 'Otro');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('sexo', 'Macho'), ('sexo', 'Hembra');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('tamano', 'Pequeño'), ('tamano', 'Mediano'), ('tamano', 'Grande');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('unidad_edad', 'Años'), ('unidad_edad', 'Meses');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_mascota', 'Disponible'), ('estado_mascota', 'En proceso'),
  ('estado_mascota', 'Adoptado'), ('estado_mascota', 'Eliminado');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('ciudad', 'Loja'), ('ciudad', 'Quito'), ('ciudad', 'Guayaquil'), ('ciudad', 'Cuenca'), ('ciudad', 'Ambato');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('tag', 'Vacunada'), ('tag', 'Vacunado'), ('tag', 'Esterilizada'), ('tag', 'Esterilizado'),
  ('tag', 'Desparasitada'), ('tag', 'Desparasitado'), ('tag', 'Sociable'), ('tag', 'Entrenada');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_solicitud_adopcion', 'revision'), ('estado_solicitud_adopcion', 'aprobada'),
  ('estado_solicitud_adopcion', 'rechazada'), ('estado_solicitud_adopcion', 'seguimiento');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_solicitud_organizacion', 'pendiente'), ('estado_solicitud_organizacion', 'aprobada'),
  ('estado_solicitud_organizacion', 'rechazada');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('tipo_vivienda', 'Casa'), ('tipo_vivienda', 'Departamento'), ('tipo_vivienda', 'Quinta'), ('tipo_vivienda', 'Otro');

INSERT INTO catalogos (tipo, nombre) VALUES
  ('tipo_donacion', 'Alimento'), ('tipo_donacion', 'Medicinas'), ('tipo_donacion', 'Accesorios'),
  ('tipo_donacion', 'Dinero'), ('tipo_donacion', 'Otro');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_donacion', 'Completado'), ('estado_donacion', 'Pendiente'), ('estado_donacion', 'Cancelado');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('tipo_medio', 'imagen'), ('tipo_medio', 'documento');

INSERT INTO catalogos (tipo, codigo) VALUES
  ('estado_denuncia', 'recibida'), ('estado_denuncia', 'revision'),
  ('estado_denuncia', 'atendida'), ('estado_denuncia', 'cerrada');
