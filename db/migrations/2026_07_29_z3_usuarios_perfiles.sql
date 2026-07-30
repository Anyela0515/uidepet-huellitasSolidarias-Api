-- =============================================================================
-- Migración: fusiona perfiles_usuario dentro de usuarios (2026-07-29)
-- =============================================================================
-- perfiles_usuario era 1:1 con usuarios, se crea siempre en la misma
-- transacción y nunca tiene ciclo de vida propio: fusionarla no pierde nada.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z3_usuarios_perfiles;

CREATE PROCEDURE _migrate_2026_07_29_z3_usuarios_perfiles()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'nombre'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN nombre VARCHAR(120) NULL AFTER password_hash,
      ADD COLUMN cedula VARCHAR(10) NULL AFTER nombre,
      ADD COLUMN telefono VARCHAR(20) NULL AFTER cedula,
      ADD COLUMN direccion VARCHAR(255) NULL AFTER telefono;

    UPDATE usuarios u
      INNER JOIN perfiles_usuario p ON p.usuario_id = u.id
      SET u.nombre = p.nombre, u.cedula = p.cedula, u.telefono = p.telefono, u.direccion = p.direccion;

    ALTER TABLE usuarios
      MODIFY nombre VARCHAR(120) NOT NULL,
      ADD UNIQUE KEY uq_usuarios_cedula (cedula);

    DROP TABLE perfiles_usuario;
  END IF;
END;

CALL _migrate_2026_07_29_z3_usuarios_perfiles();
DROP PROCEDURE _migrate_2026_07_29_z3_usuarios_perfiles;
