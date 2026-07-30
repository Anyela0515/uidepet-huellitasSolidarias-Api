-- =============================================================================
-- Migración: elimina las tablas de catálogo viejas, ya fusionadas en `catalogos` (2026-07-29)
-- =============================================================================
-- Debe correr después de z1 (copia los datos) y z2 (redirige las FKs que las
-- referenciaban) y z4 (libera tipos_medio al eliminar medios_mascota). Si
-- alguna FK todavía apuntara a estas tablas, el DROP fallaría con un error
-- claro en vez de dejar datos corruptos.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z8_eliminar_catalogos_viejos;

CREATE PROCEDURE _migrate_2026_07_29_z8_eliminar_catalogos_viejos()
BEGIN
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'roles'
  ) THEN
    DROP TABLE roles;
    DROP TABLE estados_cuenta;
    DROP TABLE estados_mascota;
    DROP TABLE estados_solicitud_adopcion;
    DROP TABLE estados_solicitud_organizacion;
    DROP TABLE estados_donacion;
    DROP TABLE estados_denuncia;
    DROP TABLE tipos_medio;
    DROP TABLE categorias;
  END IF;
END;

CALL _migrate_2026_07_29_z8_eliminar_catalogos_viejos();
DROP PROCEDURE _migrate_2026_07_29_z8_eliminar_catalogos_viejos;
