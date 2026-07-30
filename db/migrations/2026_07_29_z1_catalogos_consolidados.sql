-- =============================================================================
-- Migración: consolida roles/estados_*/categorias/tipos_medio en `catalogos` (2026-07-29)
-- =============================================================================
-- Reduce 9 tablas de catálogo a 1 sola: `catalogos` gana `codigo` (para los
-- catálogos que antes solo tenían codigo) y `padre_id` (para razas, que ya
-- existía en categorias). El tipo de catálogo distingue el dominio.
-- No borra las tablas viejas todavía: siguen existiendo hasta que las FKs
-- que las referencian se redirijan (ver 2026_07_29_z2_*), así este archivo
-- puede reintentarse sin perder de dónde vienen los datos.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z1_catalogos_consolidados;

CREATE PROCEDURE _migrate_2026_07_29_z1_catalogos_consolidados()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'catalogos' AND COLUMN_NAME = 'codigo'
  ) THEN
    ALTER TABLE catalogos
      DROP CHECK chk_catalogo_tipo,
      DROP INDEX uq_catalogo_tipo_nombre,
      MODIFY tipo VARCHAR(32) NOT NULL,
      MODIFY nombre VARCHAR(80) NULL,
      ADD COLUMN codigo VARCHAR(30) NULL AFTER tipo,
      ADD COLUMN padre_id SMALLINT UNSIGNED NULL AFTER nombre;

    ALTER TABLE catalogos
      ADD COLUMN padre_id_uniq SMALLINT UNSIGNED
        GENERATED ALWAYS AS (COALESCE(padre_id, 0)) STORED AFTER padre_id;

    ALTER TABLE catalogos
      ADD CONSTRAINT fk_catalogo_padre FOREIGN KEY (padre_id) REFERENCES catalogos(id),
      ADD UNIQUE KEY uq_catalogo_tipo_codigo (tipo, codigo),
      ADD UNIQUE KEY uq_catalogo_tipo_padre_nombre (tipo, padre_id_uniq, nombre),
      ADD CONSTRAINT chk_catalogo_tipo CHECK (tipo IN (
        'rol','estado_cuenta','estado_mascota','estado_solicitud_adopcion',
        'estado_solicitud_organizacion','estado_donacion','tipo_medio','estado_denuncia',
        'especie','raza','sexo','tamano','unidad_edad',
        'ciudad','tag','tipo_vivienda','tipo_donacion'
      )),
      ADD CONSTRAINT chk_catalogo_raza_padre CHECK (
        (tipo = 'raza' AND padre_id IS NOT NULL) OR (tipo <> 'raza' AND padre_id IS NULL)
      );

    -- especie/sexo/tamano/unidad_edad: sin padre, se copian directo.
    INSERT INTO catalogos (tipo, nombre)
      SELECT tipo, nombre FROM categorias WHERE tipo <> 'raza';

    -- raza: remapea su padre_id (especie) al id nuevo que le tocó en catalogos.
    INSERT INTO catalogos (tipo, nombre, padre_id)
      SELECT cat.tipo, cat.nombre, especie_nueva.id
      FROM categorias cat
      INNER JOIN categorias especie_vieja ON especie_vieja.id = cat.padre_id
      INNER JOIN catalogos especie_nueva
        ON especie_nueva.tipo = 'especie' AND especie_nueva.nombre = especie_vieja.nombre
      WHERE cat.tipo = 'raza';

    -- Catálogos "solo código".
    INSERT INTO catalogos (tipo, codigo) SELECT 'rol', codigo FROM roles;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_cuenta', codigo FROM estados_cuenta;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_mascota', codigo FROM estados_mascota;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_solicitud_adopcion', codigo FROM estados_solicitud_adopcion;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_solicitud_organizacion', codigo FROM estados_solicitud_organizacion;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_donacion', codigo FROM estados_donacion;
    INSERT INTO catalogos (tipo, codigo) SELECT 'tipo_medio', codigo FROM tipos_medio;
    INSERT INTO catalogos (tipo, codigo) SELECT 'estado_denuncia', codigo FROM estados_denuncia;
  END IF;
END;

CALL _migrate_2026_07_29_z1_catalogos_consolidados();
DROP PROCEDURE _migrate_2026_07_29_z1_catalogos_consolidados;
