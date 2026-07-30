-- =============================================================================
-- Migración: unifica password_reset_tokens + email_verification_tokens (2026-07-30)
-- =============================================================================
-- Ambas tablas tenían exactamente el mismo shape (token de un solo uso
-- ligado a un usuario, con expiración); solo cambiaba el propósito. Se
-- consolidan en tokens_usuario con una columna `tipo`, migrando los datos
-- existentes antes de eliminar las tablas viejas. Idempotente: si las
-- tablas viejas ya no existen (porque esta migración ya corrió), no hace
-- nada.
-- =============================================================================

CREATE TABLE IF NOT EXISTS tokens_usuario (
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

DROP PROCEDURE IF EXISTS _migrate_2026_07_30_tokens_usuario;

CREATE PROCEDURE _migrate_2026_07_30_tokens_usuario()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'password_reset_tokens'
  ) THEN
    INSERT IGNORE INTO tokens_usuario (usuario_id, tipo, token_hash, expires_at, used_at, created_at)
    SELECT usuario_id, 'recuperacion_password', token_hash, expires_at, used_at, created_at
    FROM password_reset_tokens;
    DROP TABLE password_reset_tokens;
  END IF;

  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'email_verification_tokens'
  ) THEN
    INSERT IGNORE INTO tokens_usuario (usuario_id, tipo, token_hash, expires_at, used_at, created_at)
    SELECT usuario_id, 'verificacion_email', token_hash, expires_at, used_at, created_at
    FROM email_verification_tokens;
    DROP TABLE email_verification_tokens;
  END IF;
END;

CALL _migrate_2026_07_30_tokens_usuario();
DROP PROCEDURE _migrate_2026_07_30_tokens_usuario;
