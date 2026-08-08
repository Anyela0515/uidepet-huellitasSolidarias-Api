-- =============================================================================
-- Migración: tabla de auditoría inmutable para acciones sensibles (2026-08-05)
-- =============================================================================
-- Registra quién hizo qué, sobre qué entidad y cuándo, para las acciones con
-- consecuencia real sobre personas o animales (aprobar/rechazar una
-- adopción, cambiar el rol o el estado de una cuenta, cambiar el estado de
-- un reporte de rescate o de una donación). Solo INSERT: los triggers de
-- abajo bloquean UPDATE y DELETE a nivel de base de datos, para que ni un
-- bug de la aplicación ni un acceso directo a la BD puedan alterar el
-- historial ya escrito. Aditiva e idempotente.
-- =============================================================================

CREATE TABLE IF NOT EXISTS auditoria (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NULL,
  usuario_correo VARCHAR(150) NULL,
  accion VARCHAR(80) NOT NULL,
  entidad VARCHAR(60) NOT NULL,
  entidad_id VARCHAR(60) NOT NULL,
  detalle JSON NULL,
  creado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auditoria_entidad (entidad, entidad_id),
  KEY idx_auditoria_usuario (usuario_id),
  CONSTRAINT fk_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Sin BEGIN...END ni DELIMITER a propósito: el runner de migraciones manda
-- el archivo tal cual vía mysql2 con multipleStatements, que no entiende
-- DELIMITER (eso es un truco exclusivo del cliente `mysql` de línea de
-- comandos, el servidor no lo conoce). Un solo statement en el cuerpo del
-- trigger no necesita BEGIN/END, así que no hay un ";" interno que confunda
-- el split de multi-statement.
DROP TRIGGER IF EXISTS trg_auditoria_no_update;
DROP TRIGGER IF EXISTS trg_auditoria_no_delete;

CREATE TRIGGER trg_auditoria_no_update
BEFORE UPDATE ON auditoria
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tabla auditoria es de solo lectura: no se permite UPDATE.';

CREATE TRIGGER trg_auditoria_no_delete
BEFORE DELETE ON auditoria
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tabla auditoria es de solo lectura: no se permite DELETE.';
