-- =============================================================================
-- Migración: forzar cambio de contraseña temporal (2026-07-27)
-- =============================================================================
-- Al aprobar una fundación se genera una contraseña temporal aleatoria. No
-- había forma de obligar a cambiarla en el primer login. Aditiva e
-- idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_27_forzar_cambio_password;

CREATE PROCEDURE _migrate_2026_07_27_forzar_cambio_password()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'debe_cambiar_password'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0 AFTER estado_cuenta_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_usuarios_debe_cambiar_password'
  ) THEN
    ALTER TABLE usuarios
      ADD CONSTRAINT chk_usuarios_debe_cambiar_password CHECK (debe_cambiar_password IN (0, 1));
  END IF;
END;

CALL _migrate_2026_07_27_forzar_cambio_password();
DROP PROCEDURE _migrate_2026_07_27_forzar_cambio_password;
