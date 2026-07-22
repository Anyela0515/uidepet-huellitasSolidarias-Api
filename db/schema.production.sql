-- Huellitas Solidarias — esquema relacional en 3FN
-- Sin datos derivados ni snapshots denormalizados.
-- El API ensambla el contrato camelCase del frontend vía JOINs + mappers.



CREATE DATABASE IF NOT EXISTS huellitas_solidarias_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas_solidarias_db;

-- =============================================================================
-- CATÁLOGOS
-- =============================================================================

CREATE TABLE roles (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE estados_cuenta (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE especies (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
);

-- Catálogo consolidado de atributos simples de mascota (raza, sexo, tamaño,
-- unidad de edad). `especies` queda fuera a propósito: es la categoría real
-- de la mascota y ya funciona correctamente en todo el stack; una raza sigue
-- referenciándola con una FK normal (sin auto-referencia).
CREATE TABLE categorias (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  especie_id SMALLINT UNSIGNED NULL,
  especie_id_uniq SMALLINT UNSIGNED GENERATED ALWAYS AS (COALESCE(especie_id, 0)) STORED,
  UNIQUE KEY uq_categoria_tipo_especie_nombre (tipo, especie_id_uniq, nombre),
  CONSTRAINT chk_categoria_tipo CHECK (tipo IN ('raza','sexo','tamano','unidad_edad')),
  CONSTRAINT chk_categoria_raza_especie CHECK (
    (tipo = 'raza' AND especie_id IS NOT NULL) OR
    (tipo <> 'raza' AND especie_id IS NULL)
  ),
  CONSTRAINT fk_categoria_especie
    FOREIGN KEY (especie_id) REFERENCES especies(id)
);

CREATE TABLE estados_mascota (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE ciudades (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE tags (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE estados_solicitud_adopcion (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE estados_solicitud_organizacion (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE tipos_vivienda (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE tipos_donacion (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
);

CREATE TABLE estados_donacion (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

CREATE TABLE tipos_medio (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE,
  nombre VARCHAR(60) NOT NULL
);

-- =============================================================================
-- USUARIOS / PERFILES / ORGANIZACIONES
-- =============================================================================

CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  correo VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  rol_id TINYINT UNSIGNED NOT NULL,
  estado_cuenta_id TINYINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuario_rol
    FOREIGN KEY (rol_id) REFERENCES roles(id),
  CONSTRAINT fk_usuario_estado
    FOREIGN KEY (estado_cuenta_id) REFERENCES estados_cuenta(id)
);

CREATE TABLE perfiles_usuario (
  usuario_id INT UNSIGNED PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  cedula VARCHAR(10) UNIQUE,
  telefono VARCHAR(20),
  direccion VARCHAR(255),
  CONSTRAINT fk_perfil_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_password_reset_usuario (usuario_id),
  INDEX idx_password_reset_expires (expires_at),
  CONSTRAINT fk_password_reset_usuario
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
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_org_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  CONSTRAINT fk_org_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

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
  estado_id TINYINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sol_org_correo (correo),
  UNIQUE KEY uq_sol_org_ruc (ruc),
  CONSTRAINT fk_sol_org_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  CONSTRAINT fk_sol_org_estado
    FOREIGN KEY (estado_id) REFERENCES estados_solicitud_organizacion(id)
);

-- =============================================================================
-- MASCOTAS
-- =============================================================================

CREATE TABLE mascotas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  raza_id SMALLINT UNSIGNED NOT NULL,
  edad_valor SMALLINT UNSIGNED NOT NULL,
  unidad_edad_id SMALLINT UNSIGNED NOT NULL,
  sexo_id SMALLINT UNSIGNED NOT NULL,
  tamano_id SMALLINT UNSIGNED NOT NULL,
  ciudad_id SMALLINT UNSIGNED NOT NULL,
  historia TEXT NOT NULL,
  requisitos TEXT NOT NULL,
  organizacion_id INT UNSIGNED NOT NULL,
  estado_mascota_id TINYINT UNSIGNED NOT NULL,
  publicada_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  oculto TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_mascota_raza
    FOREIGN KEY (raza_id) REFERENCES categorias(id),
  CONSTRAINT fk_mascota_unidad_edad
    FOREIGN KEY (unidad_edad_id) REFERENCES categorias(id),
  CONSTRAINT fk_mascota_sexo
    FOREIGN KEY (sexo_id) REFERENCES categorias(id),
  CONSTRAINT fk_mascota_tamano
    FOREIGN KEY (tamano_id) REFERENCES categorias(id),
  CONSTRAINT fk_mascota_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  CONSTRAINT fk_mascota_org
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  CONSTRAINT fk_mascota_estado
    FOREIGN KEY (estado_mascota_id) REFERENCES estados_mascota(id),
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
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE medios_mascota (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  mascota_id INT UNSIGNED NOT NULL,
  tipo_medio_id TINYINT UNSIGNED NOT NULL,
  contenido LONGTEXT NOT NULL,
  es_principal TINYINT(1) NOT NULL DEFAULT 1,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_medio_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id) ON DELETE CASCADE,
  CONSTRAINT fk_medio_tipo
    FOREIGN KEY (tipo_medio_id) REFERENCES tipos_medio(id),
  INDEX idx_medios_mascota (mascota_id)
);

-- =============================================================================
-- ADOPCIONES
-- =============================================================================

CREATE TABLE solicitudes_adopcion (
  id VARCHAR(50) PRIMARY KEY,
  mascota_id INT UNSIGNED NOT NULL,
  adoptante_id INT UNSIGNED NOT NULL,
  organizacion_id INT UNSIGNED NOT NULL,
  estado_id TINYINT UNSIGNED NOT NULL,
  observaciones TEXT,
  proximo_paso TEXT,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sol_adop_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id),
  CONSTRAINT fk_sol_adop_adoptante
    FOREIGN KEY (adoptante_id) REFERENCES usuarios(id),
  CONSTRAINT fk_sol_adop_org
    FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id),
  CONSTRAINT fk_sol_adop_estado
    FOREIGN KEY (estado_id) REFERENCES estados_solicitud_adopcion(id),
  INDEX idx_sol_adop_mascota (mascota_id),
  INDEX idx_sol_adop_adoptante (adoptante_id),
  INDEX idx_sol_adop_org (organizacion_id)
);

-- Datos declarados en el formulario (dependen solo de la solicitud)
CREATE TABLE formularios_adopcion (
  solicitud_id VARCHAR(50) PRIMARY KEY,
  nombre_declarado VARCHAR(120) NOT NULL,
  cedula_declarada VARCHAR(10) NOT NULL,
  telefono_declarado VARCHAR(20) NOT NULL,
  correo_declarado VARCHAR(150) NOT NULL,
  direccion_declarada VARCHAR(255) NOT NULL,
  ciudad_id SMALLINT UNSIGNED NOT NULL,
  tipo_vivienda_id TINYINT UNSIGNED NOT NULL,
  personas_hogar VARCHAR(20) NOT NULL,
  acuerdo_hogar VARCHAR(10) NOT NULL,
  permanencia_animal VARCHAR(10) NOT NULL,
  lugar_dormir VARCHAR(80) NOT NULL,
  tiene_mascotas VARCHAR(10) NOT NULL,
  cantidad_mascotas VARCHAR(20),
  vacunas VARCHAR(20),
  esterilizacion VARCHAR(20),
  responsable_cuidado VARCHAR(120) NOT NULL,
  responsable_gastos VARCHAR(120) NOT NULL,
  acepta_seguimiento VARCHAR(10) NOT NULL,
  acepta_contrato VARCHAR(10) NOT NULL,
  declaracion_veracidad TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_form_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE,
  CONSTRAINT fk_form_ciudad
    FOREIGN KEY (ciudad_id) REFERENCES ciudades(id),
  CONSTRAINT fk_form_vivienda
    FOREIGN KEY (tipo_vivienda_id) REFERENCES tipos_vivienda(id)
);

CREATE TABLE evidencias_adopcion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id VARCHAR(50) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  tamanio_bytes INT UNSIGNED,
  contenido LONGTEXT,
  CONSTRAINT fk_evid_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE,
  INDEX idx_evid_solicitud (solicitud_id)
);

CREATE TABLE seguimientos_adopcion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id VARCHAR(50) NOT NULL,
  comentario TEXT NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_seg_solicitud (solicitud_id),
  CONSTRAINT fk_seg_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id) ON DELETE CASCADE
);

CREATE TABLE archivos_seguimiento (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seguimiento_id INT UNSIGNED NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  CONSTRAINT fk_arch_seg
    FOREIGN KEY (seguimiento_id) REFERENCES seguimientos_adopcion(id) ON DELETE CASCADE
);

-- =============================================================================
-- FAVORITOS / MENSAJES / DONACIONES / SITIO
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
  estado_donacion_id TINYINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_don_usuario
    FOREIGN KEY (donante_usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_don_tipo
    FOREIGN KEY (tipo_donacion_id) REFERENCES tipos_donacion(id),
  CONSTRAINT fk_don_estado
    FOREIGN KEY (estado_donacion_id) REFERENCES estados_donacion(id)
);

CREATE TABLE configuracion_sitio (
  id TINYINT UNSIGNED PRIMARY KEY DEFAULT 1,
  correo VARCHAR(150) NOT NULL,
  telefono VARCHAR(20) NOT NULL,
  horario VARCHAR(120) NOT NULL,
  direccion VARCHAR(255) NOT NULL,
  CONSTRAINT chk_config_unica CHECK (id = 1)
);

-- =============================================================================
-- DATOS INICIALES DE CATÁLOGO
-- =============================================================================

INSERT INTO roles (codigo, nombre) VALUES
  ('usuario', 'Usuario adoptante'),
  ('fundacion', 'Fundación'),
  ('admin', 'Administrador');

INSERT INTO estados_cuenta (codigo, nombre) VALUES
  ('Activo', 'Activo'),
  ('Suspendido', 'Suspendido');

INSERT INTO especies (nombre) VALUES ('Perro'), ('Gato'), ('Otro');

INSERT INTO categorias (tipo, nombre) VALUES
  ('sexo', 'Macho'), ('sexo', 'Hembra');

INSERT INTO categorias (tipo, nombre) VALUES
  ('tamano', 'Pequeño'), ('tamano', 'Mediano'), ('tamano', 'Grande');

INSERT INTO categorias (tipo, nombre) VALUES
  ('unidad_edad', 'Años'), ('unidad_edad', 'Meses');

INSERT INTO estados_mascota (codigo, nombre) VALUES
  ('Disponible', 'Disponible'),
  ('En proceso', 'En proceso'),
  ('Adoptado', 'Adoptado'),
  ('Eliminado', 'Eliminado');

INSERT INTO ciudades (nombre) VALUES
  ('Loja'), ('Quito'), ('Guayaquil'), ('Cuenca'), ('Ambato');

INSERT INTO tags (nombre) VALUES
  ('Vacunada'), ('Vacunado'), ('Esterilizada'), ('Esterilizado'),
  ('Desparasitada'), ('Desparasitado'), ('Sociable'), ('Entrenada');

INSERT INTO estados_solicitud_adopcion (codigo, nombre) VALUES
  ('revision', 'En revisión'),
  ('aprobada', 'Aprobada'),
  ('rechazada', 'Rechazada'),
  ('seguimiento', 'Seguimiento');

INSERT INTO estados_solicitud_organizacion (codigo, nombre) VALUES
  ('pendiente', 'Pendiente'),
  ('aprobada', 'Aprobada'),
  ('rechazada', 'Rechazada');

INSERT INTO tipos_vivienda (nombre) VALUES
  ('Casa'), ('Departamento'), ('Quinta'), ('Otro');

INSERT INTO tipos_donacion (nombre) VALUES
  ('Alimento'), ('Medicinas'), ('Accesorios'), ('Dinero'), ('Otro');

INSERT INTO estados_donacion (codigo, nombre) VALUES
  ('Completado', 'Completado'),
  ('Pendiente', 'Pendiente'),
  ('Cancelado', 'Cancelado');

INSERT INTO tipos_medio (codigo, nombre) VALUES
  ('imagen', 'Imagen'),
  ('documento', 'Documento');

INSERT INTO configuracion_sitio (id, correo, telefono, horario, direccion) VALUES
  (1, 'contacto@huellitas.com', '0990001122', 'Lun–Vie 09:00–18:00', 'Campus UIDE / Loja');
