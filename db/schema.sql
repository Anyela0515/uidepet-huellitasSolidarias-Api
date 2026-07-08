DROP DATABASE IF EXISTS huellitas_solidarias_db;

CREATE DATABASE huellitas_solidarias_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE huellitas_solidarias_db;

CREATE TABLE usuarios (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  rol ENUM('adoptante','fundacion','admin') NOT NULL DEFAULT 'adoptante',
  telefono VARCHAR(20),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE fundaciones (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  ruc VARCHAR(13) UNIQUE,
  ciudad VARCHAR(80) NOT NULL,
  direccion VARCHAR(180),
  telefono VARCHAR(20),
  email VARCHAR(150),
  estado ENUM('pendiente','aprobada','rechazada') NOT NULL DEFAULT 'pendiente',
  usuario_id INT UNSIGNED UNIQUE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_fundacion_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE mascotas (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL,
  especie ENUM('perro','gato') NOT NULL,
  sexo ENUM('macho','hembra') NOT NULL,
  edad_meses INT UNSIGNED NOT NULL,
  tamanio ENUM('pequeno','mediano','grande') NOT NULL,
  color VARCHAR(80),
  descripcion VARCHAR(255),
  estado ENUM('disponible','en_revision','adoptado') NOT NULL DEFAULT 'disponible',
  esterilizado BOOLEAN NOT NULL DEFAULT FALSE,
  vacunado BOOLEAN NOT NULL DEFAULT FALSE,
  fundacion_id INT UNSIGNED NOT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mascota_fundacion
    FOREIGN KEY (fundacion_id) REFERENCES fundaciones(id)
);

CREATE TABLE solicitudes_adopcion (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  mascota_id INT UNSIGNED NOT NULL,
  tipo_vivienda ENUM('casa','departamento','finca') NOT NULL,
  tiene_patio BOOLEAN NOT NULL DEFAULT FALSE,
  tiene_mascotas BOOLEAN NOT NULL DEFAULT FALSE,
  experiencia_mascotas VARCHAR(255),
  motivo_adopcion VARCHAR(255) NOT NULL,
  estado ENUM('en_revision','aprobada','rechazada','cancelada') NOT NULL DEFAULT 'en_revision',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_solicitud_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
  CONSTRAINT fk_solicitud_mascota
    FOREIGN KEY (mascota_id) REFERENCES mascotas(id)
);

CREATE TABLE seguimientos (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  solicitud_id INT UNSIGNED NOT NULL,
  fecha_visita DATE NOT NULL,
  observacion VARCHAR(255),
  estado ENUM('pendiente','realizado','cancelado') NOT NULL DEFAULT 'pendiente',
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seguimiento_solicitud
    FOREIGN KEY (solicitud_id) REFERENCES solicitudes_adopcion(id)
);