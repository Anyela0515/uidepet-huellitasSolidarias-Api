-- =============================================================================
-- Migración: elimina configuracion_sitio (2026-07-29)
-- =============================================================================
-- El frontend ya no la consulta (los datos de contacto se leen de una
-- constante en el propio frontend); no queda ninguna ruta ni servicio que
-- la use en el backend. Tabla muerta.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z7_eliminar_configuracion_sitio;

CREATE PROCEDURE _migrate_2026_07_29_z7_eliminar_configuracion_sitio()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'configuracion_sitio'
  ) THEN
    DROP TABLE configuracion_sitio;
  END IF;
END;

CALL _migrate_2026_07_29_z7_eliminar_configuracion_sitio();
DROP PROCEDURE _migrate_2026_07_29_z7_eliminar_configuracion_sitio;
