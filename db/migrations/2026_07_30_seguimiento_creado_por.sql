-- =============================================================================
-- Migración: registra quién escribió cada seguimiento post-adopción (2026-07-30)
-- =============================================================================
-- Campo de auditoría: NULL en filas históricas (no se puede reconstruir
-- retroactivamente quién las escribió), obligatorio desde el backend para
-- cualquier seguimiento nuevo. Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_30_seguimiento_creado_por;

CREATE PROCEDURE _migrate_2026_07_30_seguimiento_creado_por()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'seguimientos_adopcion'
      AND COLUMN_NAME = 'creado_por'
  ) THEN
    ALTER TABLE seguimientos_adopcion
      ADD COLUMN creado_por INT UNSIGNED NULL AFTER comentario,
      ADD CONSTRAINT fk_seg_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL;
  END IF;
END;

CALL _migrate_2026_07_30_seguimiento_creado_por();
DROP PROCEDURE _migrate_2026_07_30_seguimiento_creado_por;
