-- =============================================================================
-- Migración: `mascotas.ubicacion` pasa de FK a catálogo de ciudades a texto libre (2026-07-29)
-- =============================================================================
-- "Ubicación Actual" al publicar una mascota siempre fue texto libre en el
-- frontend (ej. "Ciudadela del Arquitecto"), pero en la base de datos estaba
-- modelado como ciudad_id -> catalogos(tipo='ciudad'), el mismo catálogo que
-- usa el registro de fundación (una lista cerrada de 7 ciudades). Cada
-- mascota publicada creaba una fila nueva en ese catálogo compartido con el
-- texto libre completo, generando decenas de "ciudades" basura.
--
-- Esta migración:
--   1. Agrega `mascotas.ubicacion` como columna de texto directa.
--   2. Copia el texto ya guardado (vía el ciudad_id actual) antes de borrar nada.
--   3. Elimina `ciudad_id` y su FK.
--   4. Limpia del catálogo de ciudades las filas que ya no usa nadie y que
--      no son una de las 7 ciudades reales de la lista fija del frontend.
-- Destructiva pero idempotente: cada paso revisa el estado actual antes de
-- actuar, y es segura de re-ejecutar.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_mascota_ubicacion_texto;

CREATE PROCEDURE _migrate_2026_07_29_mascota_ubicacion_texto()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND COLUMN_NAME = 'ubicacion'
  ) THEN
    ALTER TABLE mascotas ADD COLUMN ubicacion VARCHAR(255) NULL AFTER tamano_id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND COLUMN_NAME = 'ciudad_id'
  ) THEN
    UPDATE mascotas m
    INNER JOIN catalogos c ON c.id = m.ciudad_id
    SET m.ubicacion = c.nombre
    WHERE m.ubicacion IS NULL;

    ALTER TABLE mascotas MODIFY COLUMN ubicacion VARCHAR(255) NOT NULL;
    ALTER TABLE mascotas DROP FOREIGN KEY fk_mascota_ciudad, DROP COLUMN ciudad_id;
  END IF;
END;

CALL _migrate_2026_07_29_mascota_ubicacion_texto();
DROP PROCEDURE _migrate_2026_07_29_mascota_ubicacion_texto;

-- Limpieza: filas de catalogos(tipo='ciudad') que ya no referencia nadie
-- (mascotas ya no puede hacerlo, tras el DROP COLUMN de arriba) y que no
-- son una de las 7 ciudades reales de la lista fija del frontend.
DELETE c FROM catalogos c
WHERE c.tipo = 'ciudad'
  AND c.nombre NOT IN ('Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Loja', 'Zamora', 'Otro')
  AND NOT EXISTS (SELECT 1 FROM organizaciones o WHERE o.ciudad_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM formularios_adopcion f WHERE f.ciudad_id = c.id)
  AND NOT EXISTS (SELECT 1 FROM solicitudes_registro_organizacion s WHERE s.ciudad_id = c.id);
