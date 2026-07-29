-- =============================================================================
-- Migración: liga los mensajes de nueva donación con su donación (2026-07-29)
-- =============================================================================
-- Permite que, al abrir el mensaje "Nueva donación — ..." en el panel de la
-- fundación, se pueda consultar y mostrar el comprobante de pago adjunto a
-- esa donación. Aditiva e idempotente.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_mensaje_donacion_id;

CREATE PROCEDURE _migrate_2026_07_29_mensaje_donacion_id()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'mensajes'
      AND COLUMN_NAME = 'donacion_id'
  ) THEN
    ALTER TABLE mensajes ADD COLUMN donacion_id VARCHAR(50) NULL AFTER solicitud_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'mensajes'
      AND CONSTRAINT_NAME = 'fk_msg_donacion'
  ) THEN
    ALTER TABLE mensajes
      ADD CONSTRAINT fk_msg_donacion
        FOREIGN KEY (donacion_id) REFERENCES donaciones(id) ON DELETE SET NULL;
  END IF;
END;

CALL _migrate_2026_07_29_mensaje_donacion_id();
DROP PROCEDURE _migrate_2026_07_29_mensaje_donacion_id;
