-- =============================================================================
-- Migración: imagen de perfil pública por organización (2026-07-28)
-- =============================================================================
-- Cada fundación sube una imagen de su organización (logo/foto), visible
-- para los usuarios en el listado público de fundaciones aliadas. Distinta
-- del QR de pago (imagen_qr). Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_28_organizacion_imagen_perfil;

CREATE PROCEDURE _migrate_2026_07_28_organizacion_imagen_perfil()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organizaciones'
      AND COLUMN_NAME = 'imagen'
  ) THEN
    ALTER TABLE organizaciones
      ADD COLUMN imagen LONGTEXT NULL;
  END IF;
END;

CALL _migrate_2026_07_28_organizacion_imagen_perfil();
DROP PROCEDURE _migrate_2026_07_28_organizacion_imagen_perfil;
