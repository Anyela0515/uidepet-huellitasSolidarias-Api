-- Agrega el teléfono del donante, que el formulario de donaciones no pedía.

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donaciones' AND COLUMN_NAME = 'telefono_donante'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE donaciones ADD COLUMN telefono_donante VARCHAR(20) AFTER correo_donante',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
