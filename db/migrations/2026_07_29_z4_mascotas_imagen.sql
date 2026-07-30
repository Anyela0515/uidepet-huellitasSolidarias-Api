-- =============================================================================
-- Migración: fusiona medios_mascota dentro de mascotas.imagen (2026-07-29)
-- =============================================================================
-- Nunca se usó la galería multi-foto (el frontend siempre maneja una sola
-- imagen principal por mascota); se conserva esa única imagen como columna
-- directa y se elimina la tabla y el endpoint de galería, que no tenían uso.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z4_mascotas_imagen;

CREATE PROCEDURE _migrate_2026_07_29_z4_mascotas_imagen()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND COLUMN_NAME = 'imagen'
  ) THEN
    ALTER TABLE mascotas ADD COLUMN imagen LONGTEXT NULL AFTER requisitos;

    UPDATE mascotas m
      SET m.imagen = (
        SELECT mm.contenido FROM medios_mascota mm
        WHERE mm.mascota_id = m.id AND mm.es_principal = 1
        ORDER BY mm.id ASC LIMIT 1
      );

    DROP TABLE medios_mascota;
  END IF;
END;

CALL _migrate_2026_07_29_z4_mascotas_imagen();
DROP PROCEDURE _migrate_2026_07_29_z4_mascotas_imagen;
