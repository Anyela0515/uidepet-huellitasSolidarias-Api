-- =============================================================================
-- Migración: fusiona formularios_adopcion dentro de solicitudes_adopcion (2026-07-29)
-- =============================================================================
-- Ambas se crean siempre juntas, en la misma transacción, y nunca hay una
-- solicitud sin su formulario. Se conservan los campos "declarados" tal cual
-- (no se derivan de usuarios): siguen siendo la foto del momento en que se
-- aplicó, que puede diferir del perfil actual del adoptante más adelante.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z5_solicitudes_formulario;

CREATE PROCEDURE _migrate_2026_07_29_z5_solicitudes_formulario()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion' AND COLUMN_NAME = 'nombre_declarado'
  ) THEN
    ALTER TABLE solicitudes_adopcion
      ADD COLUMN nombre_declarado VARCHAR(120) NULL,
      ADD COLUMN cedula_declarada VARCHAR(10) NULL,
      ADD COLUMN telefono_declarado VARCHAR(20) NULL,
      ADD COLUMN correo_declarado VARCHAR(150) NULL,
      ADD COLUMN direccion_declarada VARCHAR(255) NULL,
      ADD COLUMN ciudad_id SMALLINT UNSIGNED NULL,
      ADD COLUMN tipo_vivienda_id SMALLINT UNSIGNED NULL,
      ADD COLUMN personas_hogar VARCHAR(20) NULL,
      ADD COLUMN acuerdo_hogar VARCHAR(10) NULL,
      ADD COLUMN permanencia_animal VARCHAR(255) NULL,
      ADD COLUMN lugar_dormir VARCHAR(255) NULL,
      ADD COLUMN tiene_mascotas VARCHAR(10) NULL,
      ADD COLUMN cantidad_mascotas VARCHAR(20) NULL,
      ADD COLUMN tipos_mascotas VARCHAR(150) NULL,
      ADD COLUMN vacunas VARCHAR(20) NULL,
      ADD COLUMN esterilizacion VARCHAR(20) NULL,
      ADD COLUMN responsable_cuidado VARCHAR(120) NULL,
      ADD COLUMN responsable_gastos VARCHAR(120) NULL,
      ADD COLUMN acepta_seguimiento VARCHAR(10) NULL,
      ADD COLUMN acepta_contrato VARCHAR(10) NULL,
      ADD COLUMN declaracion_veracidad TINYINT(1) NOT NULL DEFAULT 0;

    UPDATE solicitudes_adopcion sa
      INNER JOIN formularios_adopcion f ON f.solicitud_id = sa.id
      SET
        sa.nombre_declarado = f.nombre_declarado,
        sa.cedula_declarada = f.cedula_declarada,
        sa.telefono_declarado = f.telefono_declarado,
        sa.correo_declarado = f.correo_declarado,
        sa.direccion_declarada = f.direccion_declarada,
        sa.ciudad_id = f.ciudad_id,
        sa.tipo_vivienda_id = f.tipo_vivienda_id,
        sa.personas_hogar = f.personas_hogar,
        sa.acuerdo_hogar = f.acuerdo_hogar,
        sa.permanencia_animal = f.permanencia_animal,
        sa.lugar_dormir = f.lugar_dormir,
        sa.tiene_mascotas = f.tiene_mascotas,
        sa.cantidad_mascotas = f.cantidad_mascotas,
        sa.tipos_mascotas = f.tipos_mascotas,
        sa.vacunas = f.vacunas,
        sa.esterilizacion = f.esterilizacion,
        sa.responsable_cuidado = f.responsable_cuidado,
        sa.responsable_gastos = f.responsable_gastos,
        sa.acepta_seguimiento = f.acepta_seguimiento,
        sa.acepta_contrato = f.acepta_contrato,
        sa.declaracion_veracidad = f.declaracion_veracidad;

    ALTER TABLE solicitudes_adopcion
      MODIFY nombre_declarado VARCHAR(120) NOT NULL,
      MODIFY cedula_declarada VARCHAR(10) NOT NULL,
      MODIFY telefono_declarado VARCHAR(20) NOT NULL,
      MODIFY correo_declarado VARCHAR(150) NOT NULL,
      MODIFY direccion_declarada VARCHAR(255) NOT NULL,
      MODIFY ciudad_id SMALLINT UNSIGNED NOT NULL,
      MODIFY tipo_vivienda_id SMALLINT UNSIGNED NOT NULL,
      MODIFY personas_hogar VARCHAR(20) NOT NULL,
      MODIFY acuerdo_hogar VARCHAR(10) NOT NULL,
      MODIFY permanencia_animal VARCHAR(255) NOT NULL,
      MODIFY lugar_dormir VARCHAR(255) NOT NULL,
      MODIFY tiene_mascotas VARCHAR(10) NOT NULL,
      MODIFY responsable_cuidado VARCHAR(120) NOT NULL,
      MODIFY responsable_gastos VARCHAR(120) NOT NULL,
      MODIFY acepta_seguimiento VARCHAR(10) NOT NULL,
      MODIFY acepta_contrato VARCHAR(10) NOT NULL,
      ADD CONSTRAINT fk_sol_adop_ciudad FOREIGN KEY (ciudad_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_sol_adop_vivienda FOREIGN KEY (tipo_vivienda_id) REFERENCES catalogos(id);

    DROP TABLE formularios_adopcion;
  END IF;
END;

CALL _migrate_2026_07_29_z5_solicitudes_formulario();
DROP PROCEDURE _migrate_2026_07_29_z5_solicitudes_formulario;
