-- =============================================================================
-- Migración: elimina la columna `nombre` redundante en catálogos de estado (2026-07-29)
-- =============================================================================
-- `roles`, `estados_cuenta`, `estados_mascota`, `estados_solicitud_adopcion`,
-- `estados_solicitud_organizacion`, `estados_donacion`, `estados_denuncia` y
-- `tipos_medio` guardaban un `nombre` que siempre duplicaba `codigo` (o el
-- mismo texto con otra mayúscula) y que ningún query del backend leía —
-- solo se usa `codigo` en todos los JOINs. Se elimina esa columna; el
-- endpoint que la exponía (`/catalogos/...`) sigue devolviendo `nombre` en
-- la respuesta derivándolo de `codigo` (ver catalogo.repository.ts).
-- Destructiva pero idempotente y sin pérdida real de información.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_drop_nombre_columna;

CREATE PROCEDURE _migrate_2026_07_29_drop_nombre_columna(IN tabla VARCHAR(64))
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = tabla
      AND COLUMN_NAME = 'nombre'
  ) THEN
    SET @sql = CONCAT('ALTER TABLE ', tabla, ' DROP COLUMN nombre');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END;

CALL _migrate_2026_07_29_drop_nombre_columna('roles');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_cuenta');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_mascota');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_solicitud_adopcion');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_solicitud_organizacion');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_donacion');
CALL _migrate_2026_07_29_drop_nombre_columna('estados_denuncia');
CALL _migrate_2026_07_29_drop_nombre_columna('tipos_medio');

DROP PROCEDURE _migrate_2026_07_29_drop_nombre_columna;
