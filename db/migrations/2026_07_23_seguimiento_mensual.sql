USE huellitas_solidarias_db;

DROP PROCEDURE IF EXISTS migrar_seguimiento_mensual;

CREATE PROCEDURE migrar_seguimiento_mensual()
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'seguimientos_adopcion'
      AND COLUMN_NAME = 'periodo'
  ) THEN
    ALTER TABLE seguimientos_adopcion
      ADD COLUMN periodo CHAR(7) NULL AFTER solicitud_id;
  END IF;

  UPDATE seguimientos_adopcion
  SET periodo = DATE_FORMAT(creado_en, '%Y-%m')
  WHERE periodo IS NULL OR periodo = '';

  IF EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'seguimientos_adopcion'
      AND INDEX_NAME = 'uq_seg_solicitud'
  ) THEN
    ALTER TABLE seguimientos_adopcion DROP INDEX uq_seg_solicitud;
  END IF;

  ALTER TABLE seguimientos_adopcion
    MODIFY COLUMN periodo CHAR(7) NOT NULL;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'seguimientos_adopcion'
      AND INDEX_NAME = 'uq_seg_solicitud_periodo'
  ) THEN
    ALTER TABLE seguimientos_adopcion
      ADD UNIQUE KEY uq_seg_solicitud_periodo (solicitud_id, periodo);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'archivos_seguimiento'
      AND COLUMN_NAME = 'mime_type'
  ) THEN
    ALTER TABLE archivos_seguimiento
      ADD COLUMN mime_type VARCHAR(100) NULL AFTER nombre_archivo;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'archivos_seguimiento'
      AND COLUMN_NAME = 'tamanio_bytes'
  ) THEN
    ALTER TABLE archivos_seguimiento
      ADD COLUMN tamanio_bytes INT UNSIGNED NULL AFTER mime_type;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'archivos_seguimiento'
      AND COLUMN_NAME = 'contenido'
  ) THEN
    ALTER TABLE archivos_seguimiento
      ADD COLUMN contenido LONGTEXT NULL AFTER tamanio_bytes;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'archivos_seguimiento'
      AND INDEX_NAME = 'idx_arch_seg_seguimiento'
  ) THEN
    ALTER TABLE archivos_seguimiento
      ADD INDEX idx_arch_seg_seguimiento (seguimiento_id);
  END IF;
END;

CALL migrar_seguimiento_mensual();
DROP PROCEDURE migrar_seguimiento_mensual;
