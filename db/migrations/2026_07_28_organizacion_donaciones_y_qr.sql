-- =============================================================================
-- Migración: organización destino en donaciones + QR de pago por organización (2026-07-28)
-- =============================================================================
-- El usuario debe poder elegir a qué organización dona, y el admin debe ver
-- ese destino. Cada organización sube su propia imagen de pago (puede
-- contener varios códigos QR de distintos bancos/medios combinados en una
-- sola imagen) desde su propio panel. Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_28_organizacion_donaciones_y_qr;

CREATE PROCEDURE _migrate_2026_07_28_organizacion_donaciones_y_qr()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donaciones'
      AND COLUMN_NAME = 'organizacion_id'
  ) THEN
    ALTER TABLE donaciones
      ADD COLUMN organizacion_id INT UNSIGNED NULL AFTER direccion;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_don_organizacion'
  ) THEN
    ALTER TABLE donaciones
      ADD CONSTRAINT fk_don_organizacion
        FOREIGN KEY (organizacion_id) REFERENCES organizaciones(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donaciones' AND INDEX_NAME = 'idx_donaciones_organizacion'
  ) THEN
    CREATE INDEX idx_donaciones_organizacion ON donaciones (organizacion_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'organizaciones'
      AND COLUMN_NAME = 'imagen_qr'
  ) THEN
    ALTER TABLE organizaciones
      ADD COLUMN imagen_qr LONGTEXT NULL;
  END IF;
END;

CALL _migrate_2026_07_28_organizacion_donaciones_y_qr();
DROP PROCEDURE _migrate_2026_07_28_organizacion_donaciones_y_qr;
