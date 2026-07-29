-- =============================================================================
-- Migración: verificación de correo real en el backend (2026-07-29)
-- =============================================================================
-- El registro público de adoptantes nunca envió un correo de verificación
-- real: dependía de un microservicio local (server/index.js en el repo del
-- frontend) que solo corre en desarrollo y nunca se desplegó. Esta
-- migración agrega lo necesario para verificar de verdad desde el backend
-- ya desplegado en producción:
--   - usuarios.email_verificado (DEFAULT 1: cuentas existentes quedan
--     verificadas automáticamente; solo el autoregistro nuevo empieza en 0).
--   - email_verification_tokens, con el mismo patrón que password_reset_tokens.
-- Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_verificacion_email;

CREATE PROCEDURE _migrate_2026_07_29_verificacion_email()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'email_verificado'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN email_verificado TINYINT(1) NOT NULL DEFAULT 1 AFTER debe_cambiar_password;
  END IF;
END;

CALL _migrate_2026_07_29_verificacion_email();
DROP PROCEDURE _migrate_2026_07_29_verificacion_email;

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email_verif_usuario (usuario_id),
  INDEX idx_email_verif_expires (expires_at),
  CONSTRAINT fk_email_verif_usuario
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
