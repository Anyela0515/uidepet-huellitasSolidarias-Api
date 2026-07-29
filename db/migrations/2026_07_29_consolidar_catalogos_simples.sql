-- =============================================================================
-- Migración: consolidar ciudades, tags, tipos_vivienda y tipos_donacion (2026-07-29)
-- =============================================================================
-- Estas 4 tablas eran idénticas en forma (id, nombre) y en uso (getOrCreate
-- por texto libre desde el frontend), sin relación jerárquica entre sí. Se
-- consolidan en una sola tabla `catalogos` (tipo, nombre), igual que
-- `categorias` ya hace con especie/raza/sexo/tamaño/unidad_edad.
--
-- Los ids cambian (catalogos empieza su propio AUTO_INCREMENT), así que cada
-- FK que apuntaba a las tablas viejas se remapea por nombre antes de
-- reapuntar a `catalogos`. Aditiva sobre los datos e idempotente: se puede
-- re-ejecutar sin duplicar filas ni romper si ya se aplicó.
-- =============================================================================

CREATE TABLE IF NOT EXISTS catalogos (
  id SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  tipo VARCHAR(20) NOT NULL,
  nombre VARCHAR(80) NOT NULL,
  UNIQUE KEY uq_catalogo_tipo_nombre (tipo, nombre),
  CONSTRAINT chk_catalogo_tipo CHECK (tipo IN ('ciudad','tag','tipo_vivienda','tipo_donacion'))
);

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_consolidar_catalogos;

CREATE PROCEDURE _migrate_2026_07_29_consolidar_catalogos()
BEGIN
  -- 1) Copiar filas de las 4 tablas viejas a `catalogos`, si aún existen.
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ciudades'
  ) THEN
    INSERT INTO catalogos (tipo, nombre)
      SELECT 'ciudad', old.nombre FROM ciudades old
      WHERE NOT EXISTS (
        SELECT 1 FROM catalogos c WHERE c.tipo = 'ciudad' AND c.nombre = old.nombre
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags'
  ) THEN
    INSERT INTO catalogos (tipo, nombre)
      SELECT 'tag', old.nombre FROM tags old
      WHERE NOT EXISTS (
        SELECT 1 FROM catalogos c WHERE c.tipo = 'tag' AND c.nombre = old.nombre
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_vivienda'
  ) THEN
    INSERT INTO catalogos (tipo, nombre)
      SELECT 'tipo_vivienda', old.nombre FROM tipos_vivienda old
      WHERE NOT EXISTS (
        SELECT 1 FROM catalogos c WHERE c.tipo = 'tipo_vivienda' AND c.nombre = old.nombre
      );
  END IF;

  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_donacion'
  ) THEN
    INSERT INTO catalogos (tipo, nombre)
      SELECT 'tipo_donacion', old.nombre FROM tipos_donacion old
      WHERE NOT EXISTS (
        SELECT 1 FROM catalogos c WHERE c.tipo = 'tipo_donacion' AND c.nombre = old.nombre
      );
  END IF;

  -- 2) Remapear cada FK: reemplazar el id viejo por el id nuevo en catalogos
  --    (por nombre), luego soltar el FK viejo y crear uno nuevo hacia
  --    catalogos. Solo si la tabla vieja todavía existe (si ya se migró
  --    antes y se borró, no hay nada que remapear).

  -- organizaciones.ciudad_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ciudades'
  ) THEN
    -- El FK viejo (hacia `ciudades`) se suelta ANTES del UPDATE: si se
    -- actualizara primero, MySQL validaría el id nuevo (de `catalogos`)
    -- contra la tabla vieja y fallaría en cuanto los ids no coincidieran.
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_org_ciudad'
    ) THEN
      ALTER TABLE organizaciones DROP FOREIGN KEY fk_org_ciudad;
    END IF;
    UPDATE organizaciones o
      INNER JOIN ciudades old ON old.id = o.ciudad_id
      INNER JOIN catalogos c ON c.tipo = 'ciudad' AND c.nombre = old.nombre
      SET o.ciudad_id = c.id;
    ALTER TABLE organizaciones
      ADD CONSTRAINT fk_org_ciudad FOREIGN KEY (ciudad_id) REFERENCES catalogos(id);

    -- solicitudes_registro_organizacion.ciudad_id
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_sol_org_ciudad'
    ) THEN
      ALTER TABLE solicitudes_registro_organizacion DROP FOREIGN KEY fk_sol_org_ciudad;
    END IF;
    UPDATE solicitudes_registro_organizacion s
      INNER JOIN ciudades old ON old.id = s.ciudad_id
      INNER JOIN catalogos c ON c.tipo = 'ciudad' AND c.nombre = old.nombre
      SET s.ciudad_id = c.id;
    ALTER TABLE solicitudes_registro_organizacion
      ADD CONSTRAINT fk_sol_org_ciudad FOREIGN KEY (ciudad_id) REFERENCES catalogos(id);

    -- mascotas.ciudad_id
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_mascota_ciudad'
    ) THEN
      ALTER TABLE mascotas DROP FOREIGN KEY fk_mascota_ciudad;
    END IF;
    UPDATE mascotas m
      INNER JOIN ciudades old ON old.id = m.ciudad_id
      INNER JOIN catalogos c ON c.tipo = 'ciudad' AND c.nombre = old.nombre
      SET m.ciudad_id = c.id;
    ALTER TABLE mascotas
      ADD CONSTRAINT fk_mascota_ciudad FOREIGN KEY (ciudad_id) REFERENCES catalogos(id);

    -- formularios_adopcion.ciudad_id
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_form_ciudad'
    ) THEN
      ALTER TABLE formularios_adopcion DROP FOREIGN KEY fk_form_ciudad;
    END IF;
    UPDATE formularios_adopcion f
      INNER JOIN ciudades old ON old.id = f.ciudad_id
      INNER JOIN catalogos c ON c.tipo = 'ciudad' AND c.nombre = old.nombre
      SET f.ciudad_id = c.id;
    ALTER TABLE formularios_adopcion
      ADD CONSTRAINT fk_form_ciudad FOREIGN KEY (ciudad_id) REFERENCES catalogos(id);
  END IF;

  -- mascota_tag.tag_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tags'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_mt_tag'
    ) THEN
      ALTER TABLE mascota_tag DROP FOREIGN KEY fk_mt_tag;
    END IF;
    UPDATE mascota_tag mt
      INNER JOIN tags old ON old.id = mt.tag_id
      INNER JOIN catalogos c ON c.tipo = 'tag' AND c.nombre = old.nombre
      SET mt.tag_id = c.id;
    ALTER TABLE mascota_tag
      ADD CONSTRAINT fk_mt_tag FOREIGN KEY (tag_id) REFERENCES catalogos(id);
  END IF;

  -- formularios_adopcion.tipo_vivienda_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_vivienda'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_form_vivienda'
    ) THEN
      ALTER TABLE formularios_adopcion DROP FOREIGN KEY fk_form_vivienda;
    END IF;
    -- tipos_vivienda.id era TINYINT UNSIGNED; catalogos.id es SMALLINT
    -- UNSIGNED. Hay que ensanchar la columna antes de poder crear el FK.
    ALTER TABLE formularios_adopcion
      MODIFY COLUMN tipo_vivienda_id SMALLINT UNSIGNED NOT NULL;
    UPDATE formularios_adopcion f
      INNER JOIN tipos_vivienda old ON old.id = f.tipo_vivienda_id
      INNER JOIN catalogos c ON c.tipo = 'tipo_vivienda' AND c.nombre = old.nombre
      SET f.tipo_vivienda_id = c.id;
    ALTER TABLE formularios_adopcion
      ADD CONSTRAINT fk_form_vivienda FOREIGN KEY (tipo_vivienda_id) REFERENCES catalogos(id);
  END IF;

  -- donaciones.tipo_donacion_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tipos_donacion'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'fk_don_tipo'
    ) THEN
      ALTER TABLE donaciones DROP FOREIGN KEY fk_don_tipo;
    END IF;
    UPDATE donaciones d
      INNER JOIN tipos_donacion old ON old.id = d.tipo_donacion_id
      INNER JOIN catalogos c ON c.tipo = 'tipo_donacion' AND c.nombre = old.nombre
      SET d.tipo_donacion_id = c.id;
    ALTER TABLE donaciones
      ADD CONSTRAINT fk_don_tipo FOREIGN KEY (tipo_donacion_id) REFERENCES catalogos(id);
  END IF;

  -- 3) Ya remapeado todo: soltar las tablas viejas.
  DROP TABLE IF EXISTS ciudades;
  DROP TABLE IF EXISTS tags;
  DROP TABLE IF EXISTS tipos_vivienda;
  DROP TABLE IF EXISTS tipos_donacion;
END;

CALL _migrate_2026_07_29_consolidar_catalogos();
DROP PROCEDURE _migrate_2026_07_29_consolidar_catalogos;
