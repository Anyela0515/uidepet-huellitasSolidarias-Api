-- =============================================================================
-- Migración: tabla de auditoría para acciones sensibles (2026-08-05)
-- =============================================================================
-- Registra quién hizo qué, sobre qué entidad y cuándo, para las acciones con
-- consecuencia real sobre personas o animales (aprobar/rechazar una
-- adopción, cambiar el rol o el estado de una cuenta, cambiar el estado de
-- un reporte de rescate o de una donación). La aplicación nunca hace
-- UPDATE/DELETE sobre esta tabla (ver auditoria.repository.ts). La
-- protección a nivel de motor (triggers que lo bloquean aunque alguien
-- entre directo a la BD) se agrega aparte en
-- 2026_08_07_auditoria_triggers_inmutable.sql, porque requiere un privilegio
-- que el usuario de RDS no tiene por defecto. Aditiva e idempotente.
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
