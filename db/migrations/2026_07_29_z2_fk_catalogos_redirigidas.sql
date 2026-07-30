-- =============================================================================
-- Migración: redirige las FKs de roles/estados_*/categorias hacia `catalogos` (2026-07-29)
-- =============================================================================
-- Cada bloque es independiente y se puede reintentar solo: revisa si la FK de
-- esa tabla todavía apunta a la tabla vieja antes de tocar nada, así que si
-- este archivo falla a la mitad, un reintento no vuelve a remapear lo que ya
-- quedó apuntando a catalogos.
-- =============================================================================

DROP PROCEDURE IF EXISTS _migrate_2026_07_29_z2_fk_catalogos_redirigidas;

CREATE PROCEDURE _migrate_2026_07_29_z2_fk_catalogos_redirigidas()
BEGIN
  -- usuarios.rol_id / estado_cuenta_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios'
      AND CONSTRAINT_NAME = 'fk_usuario_rol' AND REFERENCED_TABLE_NAME = 'roles'
  ) THEN
    ALTER TABLE usuarios
      DROP FOREIGN KEY fk_usuario_rol,
      DROP FOREIGN KEY fk_usuario_estado;

    UPDATE usuarios u
      INNER JOIN roles r ON r.id = u.rol_id
      INNER JOIN catalogos c ON c.tipo = 'rol' AND c.codigo = r.codigo
      SET u.rol_id = c.id;

    UPDATE usuarios u
      INNER JOIN estados_cuenta e ON e.id = u.estado_cuenta_id
      INNER JOIN catalogos c ON c.tipo = 'estado_cuenta' AND c.codigo = e.codigo
      SET u.estado_cuenta_id = c.id;

    ALTER TABLE usuarios
      MODIFY rol_id SMALLINT UNSIGNED NOT NULL,
      MODIFY estado_cuenta_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_usuario_rol FOREIGN KEY (rol_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_usuario_estado FOREIGN KEY (estado_cuenta_id) REFERENCES catalogos(id);
  END IF;

  -- mascotas.raza_id / unidad_edad_id / sexo_id / tamano_id / estado_mascota_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas'
      AND CONSTRAINT_NAME = 'fk_mascota_raza' AND REFERENCED_TABLE_NAME = 'categorias'
  ) THEN
    ALTER TABLE mascotas
      DROP FOREIGN KEY fk_mascota_raza,
      DROP FOREIGN KEY fk_mascota_unidad_edad,
      DROP FOREIGN KEY fk_mascota_sexo,
      DROP FOREIGN KEY fk_mascota_tamano,
      DROP FOREIGN KEY fk_mascota_estado;

    UPDATE mascotas m
      INNER JOIN categorias r_old ON r_old.id = m.raza_id
      INNER JOIN categorias e_old ON e_old.id = r_old.padre_id
      INNER JOIN catalogos e_new ON e_new.tipo = 'especie' AND e_new.nombre = e_old.nombre
      INNER JOIN catalogos r_new ON r_new.tipo = 'raza' AND r_new.nombre = r_old.nombre AND r_new.padre_id = e_new.id
      SET m.raza_id = r_new.id;

    UPDATE mascotas m
      INNER JOIN categorias ue_old ON ue_old.id = m.unidad_edad_id
      INNER JOIN catalogos ue_new ON ue_new.tipo = 'unidad_edad' AND ue_new.nombre = ue_old.nombre
      SET m.unidad_edad_id = ue_new.id;

    UPDATE mascotas m
      INNER JOIN categorias s_old ON s_old.id = m.sexo_id
      INNER JOIN catalogos s_new ON s_new.tipo = 'sexo' AND s_new.nombre = s_old.nombre
      SET m.sexo_id = s_new.id;

    UPDATE mascotas m
      INNER JOIN categorias t_old ON t_old.id = m.tamano_id
      INNER JOIN catalogos t_new ON t_new.tipo = 'tamano' AND t_new.nombre = t_old.nombre
      SET m.tamano_id = t_new.id;

    UPDATE mascotas m
      INNER JOIN estados_mascota em_old ON em_old.id = m.estado_mascota_id
      INNER JOIN catalogos em_new ON em_new.tipo = 'estado_mascota' AND em_new.codigo = em_old.codigo
      SET m.estado_mascota_id = em_new.id;

    ALTER TABLE mascotas
      MODIFY raza_id SMALLINT UNSIGNED NOT NULL,
      MODIFY unidad_edad_id SMALLINT UNSIGNED NOT NULL,
      MODIFY sexo_id SMALLINT UNSIGNED NOT NULL,
      MODIFY tamano_id SMALLINT UNSIGNED NOT NULL,
      MODIFY estado_mascota_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_mascota_raza FOREIGN KEY (raza_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_mascota_unidad_edad FOREIGN KEY (unidad_edad_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_mascota_sexo FOREIGN KEY (sexo_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_mascota_tamano FOREIGN KEY (tamano_id) REFERENCES catalogos(id),
      ADD CONSTRAINT fk_mascota_estado FOREIGN KEY (estado_mascota_id) REFERENCES catalogos(id);
  END IF;

  -- solicitudes_registro_organizacion.estado_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_registro_organizacion'
      AND CONSTRAINT_NAME = 'fk_sol_org_estado' AND REFERENCED_TABLE_NAME = 'estados_solicitud_organizacion'
  ) THEN
    ALTER TABLE solicitudes_registro_organizacion DROP FOREIGN KEY fk_sol_org_estado;

    UPDATE solicitudes_registro_organizacion s
      INNER JOIN estados_solicitud_organizacion e ON e.id = s.estado_id
      INNER JOIN catalogos c ON c.tipo = 'estado_solicitud_organizacion' AND c.codigo = e.codigo
      SET s.estado_id = c.id;

    ALTER TABLE solicitudes_registro_organizacion
      MODIFY estado_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_sol_org_estado FOREIGN KEY (estado_id) REFERENCES catalogos(id);
  END IF;

  -- solicitudes_adopcion.estado_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion'
      AND CONSTRAINT_NAME = 'fk_sol_adop_estado' AND REFERENCED_TABLE_NAME = 'estados_solicitud_adopcion'
  ) THEN
    ALTER TABLE solicitudes_adopcion DROP FOREIGN KEY fk_sol_adop_estado;

    UPDATE solicitudes_adopcion sa
      INNER JOIN estados_solicitud_adopcion e ON e.id = sa.estado_id
      INNER JOIN catalogos c ON c.tipo = 'estado_solicitud_adopcion' AND c.codigo = e.codigo
      SET sa.estado_id = c.id;

    ALTER TABLE solicitudes_adopcion
      MODIFY estado_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_sol_adop_estado FOREIGN KEY (estado_id) REFERENCES catalogos(id);
  END IF;

  -- donaciones.estado_donacion_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donaciones'
      AND CONSTRAINT_NAME = 'fk_don_estado' AND REFERENCED_TABLE_NAME = 'estados_donacion'
  ) THEN
    ALTER TABLE donaciones DROP FOREIGN KEY fk_don_estado;

    UPDATE donaciones d
      INNER JOIN estados_donacion e ON e.id = d.estado_donacion_id
      INNER JOIN catalogos c ON c.tipo = 'estado_donacion' AND c.codigo = e.codigo
      SET d.estado_donacion_id = c.id;

    ALTER TABLE donaciones
      MODIFY estado_donacion_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_don_estado FOREIGN KEY (estado_donacion_id) REFERENCES catalogos(id);
  END IF;

  -- denuncias_rescate.estado_id
  IF EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'denuncias_rescate'
      AND CONSTRAINT_NAME = 'fk_denuncia_estado' AND REFERENCED_TABLE_NAME = 'estados_denuncia'
  ) THEN
    ALTER TABLE denuncias_rescate DROP FOREIGN KEY fk_denuncia_estado;

    UPDATE denuncias_rescate dr
      INNER JOIN estados_denuncia e ON e.id = dr.estado_id
      INNER JOIN catalogos c ON c.tipo = 'estado_denuncia' AND c.codigo = e.codigo
      SET dr.estado_id = c.id;

    ALTER TABLE denuncias_rescate
      MODIFY estado_id SMALLINT UNSIGNED NOT NULL,
      ADD CONSTRAINT fk_denuncia_estado FOREIGN KEY (estado_id) REFERENCES catalogos(id);
  END IF;
END;

CALL _migrate_2026_07_29_z2_fk_catalogos_redirigidas();
DROP PROCEDURE _migrate_2026_07_29_z2_fk_catalogos_redirigidas;
