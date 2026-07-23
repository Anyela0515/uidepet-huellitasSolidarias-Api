-- =============================================================================
-- Migración: ampliar formulario de adopción (2026-07-23)
-- =============================================================================
-- El frontend recoge "permanencia_animal" y "lugar_dormir" con un textarea de
-- descripción libre, pero esas columnas se crearon como VARCHAR(10) y
-- VARCHAR(80) respectivamente, demasiado pequeñas para una respuesta real
-- ("ER_DATA_TOO_LONG" al enviar una solicitud de adopción real). También se
-- agrega "tipos_mascotas", un campo que el frontend ya recoge pero que nunca
-- tuvo columna donde guardarse.
--
-- MODIFY COLUMN es idempotente por sí solo (re-ejecutarlo con el mismo tipo
-- no falla). ADD COLUMN sí necesita el patrón de procedimiento temporal que
-- ya usa 2026_07_19_integridad_y_backend_huellitas.sql, porque MySQL 8 no
-- soporta `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
-- =============================================================================

USE huellitas_solidarias_db;

ALTER TABLE formularios_adopcion
  MODIFY COLUMN permanencia_animal VARCHAR(255) NOT NULL,
  MODIFY COLUMN lugar_dormir VARCHAR(255) NOT NULL;

DROP PROCEDURE IF EXISTS _migrate_2026_07_23;

CREATE PROCEDURE _migrate_2026_07_23()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'formularios_adopcion'
      AND COLUMN_NAME = 'tipos_mascotas'
  ) THEN
    ALTER TABLE formularios_adopcion
      ADD COLUMN tipos_mascotas VARCHAR(150) NULL AFTER cantidad_mascotas;
  END IF;
END;

CALL _migrate_2026_07_23();
DROP PROCEDURE IF EXISTS _migrate_2026_07_23;
