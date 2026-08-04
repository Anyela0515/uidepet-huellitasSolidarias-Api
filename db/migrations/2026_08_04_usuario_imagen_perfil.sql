-- =============================================================================
-- Migración: foto de perfil por usuario (2026-08-04)
-- =============================================================================
-- Cada usuario (adoptante o fundación) puede subir una foto de perfil desde
-- su propia cuenta. Si no sube ninguna, el frontend muestra un ícono
-- genérico. Mismo patrón que organizaciones.imagen. Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_08_04_usuario_imagen_perfil;

CREATE PROCEDURE _migrate_2026_08_04_usuario_imagen_perfil()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'usuarios'
      AND COLUMN_NAME = 'imagen'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN imagen LONGTEXT NULL;
  END IF;
END;

CALL _migrate_2026_08_04_usuario_imagen_perfil();
DROP PROCEDURE _migrate_2026_08_04_usuario_imagen_perfil;
