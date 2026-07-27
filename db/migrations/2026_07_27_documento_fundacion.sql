-- =============================================================================
-- Migración: contenido real del documento de registro de organización (2026-07-27)
-- =============================================================================
-- solicitudes_registro_organizacion.nombre_documento solo guardaba el nombre
-- del archivo; el PDF en sí nunca se subía. Se agrega una columna para el
-- contenido en base64 (mismo patrón que medios_mascota.contenido /
-- evidencias_denuncia.contenido). Aditivo e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_27_documento_fundacion;

CREATE PROCEDURE _migrate_2026_07_27_documento_fundacion()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'solicitudes_registro_organizacion'
      AND COLUMN_NAME = 'documento_contenido'
  ) THEN
    ALTER TABLE solicitudes_registro_organizacion
      ADD COLUMN documento_contenido LONGTEXT NULL AFTER nombre_documento;
  END IF;
END;

CALL _migrate_2026_07_27_documento_fundacion();
DROP PROCEDURE _migrate_2026_07_27_documento_fundacion;
