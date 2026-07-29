-- Catálogo de estados + tablas del módulo de reportes ciudadanos de rescate
-- ("Reportar rescate" en el frontend, hoy sin backend real detrás).
-- Aditivo e idempotente: CREATE TABLE IF NOT EXISTS + INSERT IGNORE, seguro
-- de re-ejecutar sobre una base que ya tenga estas tablas.

-- `codigo` es el único dato real (ver migración 2026_07_29 que elimina el
-- `nombre` redundante de este y otros catálogos de estado); no se declara
-- aquí para que esta tabla quede igual sin importar en qué orden corran
-- las migraciones.
CREATE TABLE IF NOT EXISTS estados_denuncia (
  id TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  codigo VARCHAR(30) NOT NULL UNIQUE
);

INSERT IGNORE INTO estados_denuncia (codigo) VALUES
  ('recibida'),
  ('revision'),
  ('atendida'),
  ('cerrada');

CREATE TABLE IF NOT EXISTS denuncias_rescate (
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
  estado_id TINYINT UNSIGNED NOT NULL,
  creado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_denuncia_estado
    FOREIGN KEY (estado_id) REFERENCES estados_denuncia(id),
  INDEX idx_denuncia_estado (estado_id)
);

CREATE TABLE IF NOT EXISTS evidencias_denuncia (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  denuncia_id VARCHAR(50) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100),
  tamanio_bytes INT UNSIGNED,
  contenido LONGTEXT,
  CONSTRAINT fk_evid_denuncia
    FOREIGN KEY (denuncia_id) REFERENCES denuncias_rescate(id) ON DELETE CASCADE,
  INDEX idx_evid_denuncia (denuncia_id)
);
