-- =============================================================================
-- Migración: comprobante de pago en donaciones económicas (2026-07-29)
-- =============================================================================
-- Al donar un aporte económico, el donante sube su comprobante de pago; se
-- guarda junto a la donación y se envía por correo a la organización
-- beneficiaria. Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_donacion_comprobante;

CREATE PROCEDURE _migrate_2026_07_29_donacion_comprobante()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'donaciones'
      AND COLUMN_NAME = 'comprobante_pago'
  ) THEN
    ALTER TABLE donaciones
      ADD COLUMN comprobante_pago LONGTEXT NULL;
  END IF;
END;

CALL _migrate_2026_07_29_donacion_comprobante();
DROP PROCEDURE _migrate_2026_07_29_donacion_comprobante;
