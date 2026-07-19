-- =============================================================================
-- Migración: integridad y backend Huellitas Solidarias (2026-07-19)
-- =============================================================================
-- Objetivo: cerrar brechas de integridad/rendimiento detectadas en la
-- implementación integral del backend, SIN pérdida de datos y de forma
-- segura de re-ejecutar (idempotente).
--
-- Esta migración NUNCA usa DROP DATABASE / TRUNCATE / DROP TABLE.
-- Todos los cambios son aditivos: nuevas columnas (con DEFAULT), nuevos
-- índices y nuevas restricciones CHECK — y estas últimas solo se agregan
-- si los datos existentes ya las cumplen (se auditan antes de aplicarlas).
--
-- Requiere ejecutarse sobre la base `huellitas_solidarias_db` ya creada
-- por db/schema.sql (no crea la base de datos).
-- =============================================================================

USE huellitas_solidarias_db;

-- =============================================================================
-- 0. AUDITORÍA PREVIA (solo lectura)
-- Estas consultas no deberían devolver filas en una base de datos sana.
-- Si devuelven filas, documentar el hallazgo en el informe antes de seguir:
-- esta migración NO borra ni corrige huérfanos automáticamente.
-- =============================================================================

-- Perfiles sin usuario (no debería ocurrir: FK ON DELETE CASCADE ya existe)
SELECT 'auditoria_perfiles_huerfanos' AS auditoria, p.*
FROM perfiles_usuario p
LEFT JOIN usuarios u ON u.id = p.usuario_id
WHERE u.id IS NULL;

-- Organizaciones sin usuario
SELECT 'auditoria_organizaciones_huerfanas' AS auditoria, o.*
FROM organizaciones o
LEFT JOIN usuarios u ON u.id = o.usuario_id
WHERE u.id IS NULL;

-- Mascotas sin organización
SELECT 'auditoria_mascotas_huerfanas' AS auditoria, m.*
FROM mascotas m
LEFT JOIN organizaciones o ON o.id = m.organizacion_id
WHERE o.id IS NULL;

-- Solicitudes de adopción sin mascota
SELECT 'auditoria_solicitudes_sin_mascota' AS auditoria, s.*
FROM solicitudes_adopcion s
LEFT JOIN mascotas m ON m.id = s.mascota_id
WHERE m.id IS NULL;

-- Solicitudes de adopción sin adoptante
SELECT 'auditoria_solicitudes_sin_adoptante' AS auditoria, s.*
FROM solicitudes_adopcion s
LEFT JOIN usuarios u ON u.id = s.adoptante_id
WHERE u.id IS NULL;

-- Formularios sin solicitud
SELECT 'auditoria_formularios_huerfanos' AS auditoria, f.*
FROM formularios_adopcion f
LEFT JOIN solicitudes_adopcion s ON s.id = f.solicitud_id
WHERE s.id IS NULL;

-- Correos duplicados en usuarios (violaría el UNIQUE ya existente si aparece)
SELECT 'auditoria_correos_duplicados' AS auditoria, d.correo, COUNT(*) AS total
FROM usuarios d
GROUP BY d.correo
HAVING COUNT(*) > 1;

-- Cédulas fuera de longitud (candidatas a bloquear el CHECK de la sección 2)
SELECT 'auditoria_cedulas_invalidas' AS auditoria, usuario_id, cedula
FROM perfiles_usuario
WHERE cedula IS NOT NULL AND CHAR_LENGTH(cedula) <> 10;

-- RUC fuera de longitud (candidatos a bloquear el CHECK de la sección 2)
SELECT 'auditoria_ruc_invalidos' AS auditoria, id, ruc
FROM organizaciones
WHERE ruc IS NOT NULL AND CHAR_LENGTH(ruc) <> 13;

-- =============================================================================
-- 1-3. Procedimiento temporal con todos los cambios guardados (idempotentes)
-- =============================================================================
-- Se agrupan en un procedimiento porque MySQL 8 no soporta
-- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` ni `CREATE INDEX IF NOT EXISTS`.
-- El procedimiento se elimina al final: no queda como objeto permanente.

-- Nota: no se usa `DELIMITER` porque es una directiva exclusiva del cliente
-- interactivo `mysql` (divide la entrada ANTES de enviarla al servidor). Este
-- script se ejecuta vía mysql2 con multipleStatements sobre el protocolo real,
-- donde el parser del servidor ya interpreta correctamente los `;` internos
-- de un CREATE PROCEDURE ... BEGIN ... END como parte de un único statement.
DROP PROCEDURE IF EXISTS _migrate_2026_07_19;

CREATE PROCEDURE _migrate_2026_07_19()
BEGIN
  -- ---------------------------------------------------------------------
  -- 1. Borrado lógico de organizaciones: columna `activo`
  -- ---------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'organizaciones' AND COLUMN_NAME = 'activo'
  ) THEN
    ALTER TABLE organizaciones
      ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_organizaciones_activo'
  ) THEN
    ALTER TABLE organizaciones
      ADD CONSTRAINT chk_organizaciones_activo CHECK (activo IN (0, 1));
  END IF;

  -- ---------------------------------------------------------------------
  -- 2. Restricciones CHECK compatibles (solo si los datos ya las cumplen)
  -- ---------------------------------------------------------------------
  IF (SELECT COUNT(*) FROM perfiles_usuario WHERE cedula IS NOT NULL AND CHAR_LENGTH(cedula) <> 10) = 0
     AND NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_perfiles_cedula_len'
     ) THEN
    ALTER TABLE perfiles_usuario
      ADD CONSTRAINT chk_perfiles_cedula_len CHECK (cedula IS NULL OR CHAR_LENGTH(cedula) = 10);
  END IF;

  IF (SELECT COUNT(*) FROM organizaciones WHERE ruc IS NOT NULL AND CHAR_LENGTH(ruc) <> 13) = 0
     AND NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_organizaciones_ruc_len'
     ) THEN
    ALTER TABLE organizaciones
      ADD CONSTRAINT chk_organizaciones_ruc_len CHECK (ruc IS NULL OR CHAR_LENGTH(ruc) = 13);
  END IF;

  IF (SELECT COUNT(*) FROM mascotas WHERE edad_valor < 0) = 0
     AND NOT EXISTS (
       SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_mascotas_edad_valor'
     ) THEN
    ALTER TABLE mascotas
      ADD CONSTRAINT chk_mascotas_edad_valor CHECK (edad_valor >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_mascotas_oculto'
  ) THEN
    ALTER TABLE mascotas ADD CONSTRAINT chk_mascotas_oculto CHECK (oculto IN (0, 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_medios_es_principal'
  ) THEN
    ALTER TABLE medios_mascota
      ADD CONSTRAINT chk_medios_es_principal CHECK (es_principal IN (0, 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_formularios_declaracion'
  ) THEN
    ALTER TABLE formularios_adopcion
      ADD CONSTRAINT chk_formularios_declaracion CHECK (declaracion_veracidad IN (0, 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = 'chk_mensajes_leido'
  ) THEN
    ALTER TABLE mensajes ADD CONSTRAINT chk_mensajes_leido CHECK (leido IN (0, 1));
  END IF;

  -- ---------------------------------------------------------------------
  -- 3. Índices compuestos para las consultas reales del backend
  --    (no duplican los índices simples que ya crean las FK/PK/UNIQUE)
  -- ---------------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND INDEX_NAME = 'idx_usuarios_rol_estado'
  ) THEN
    CREATE INDEX idx_usuarios_rol_estado ON usuarios (rol_id, estado_cuenta_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND INDEX_NAME = 'idx_mascotas_org_estado'
  ) THEN
    CREATE INDEX idx_mascotas_org_estado ON mascotas (organizacion_id, estado_mascota_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND INDEX_NAME = 'idx_mascotas_ciudad_estado'
  ) THEN
    CREATE INDEX idx_mascotas_ciudad_estado ON mascotas (ciudad_id, estado_mascota_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND INDEX_NAME = 'idx_mascotas_raza_estado'
  ) THEN
    CREATE INDEX idx_mascotas_raza_estado ON mascotas (raza_id, estado_mascota_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND INDEX_NAME = 'idx_mascotas_publicada'
  ) THEN
    CREATE INDEX idx_mascotas_publicada ON mascotas (publicada_en);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mascotas' AND INDEX_NAME = 'idx_mascotas_oculto_estado'
  ) THEN
    CREATE INDEX idx_mascotas_oculto_estado ON mascotas (oculto, estado_mascota_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion' AND INDEX_NAME = 'idx_solicitudes_adoptante_estado'
  ) THEN
    CREATE INDEX idx_solicitudes_adoptante_estado ON solicitudes_adopcion (adoptante_id, estado_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion' AND INDEX_NAME = 'idx_solicitudes_org_estado'
  ) THEN
    CREATE INDEX idx_solicitudes_org_estado ON solicitudes_adopcion (organizacion_id, estado_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion' AND INDEX_NAME = 'idx_solicitudes_mascota_estado'
  ) THEN
    CREATE INDEX idx_solicitudes_mascota_estado ON solicitudes_adopcion (mascota_id, estado_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'solicitudes_adopcion' AND INDEX_NAME = 'idx_solicitudes_creado'
  ) THEN
    CREATE INDEX idx_solicitudes_creado ON solicitudes_adopcion (creado_en);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensajes' AND INDEX_NAME = 'idx_mensajes_org_leido'
  ) THEN
    CREATE INDEX idx_mensajes_org_leido ON mensajes (organizacion_id, leido);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensajes' AND INDEX_NAME = 'idx_mensajes_creado'
  ) THEN
    CREATE INDEX idx_mensajes_creado ON mensajes (creado_en);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donaciones' AND INDEX_NAME = 'idx_donaciones_estado_creado'
  ) THEN
    CREATE INDEX idx_donaciones_estado_creado ON donaciones (estado_donacion_id, creado_en);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'donaciones' AND INDEX_NAME = 'idx_donaciones_tipo_estado'
  ) THEN
    CREATE INDEX idx_donaciones_tipo_estado ON donaciones (tipo_donacion_id, estado_donacion_id);
  END IF;
END;

CALL _migrate_2026_07_19();
DROP PROCEDURE _migrate_2026_07_19;

-- =============================================================================
-- Notas de diseño (decisiones deliberadas, no omisiones):
--
-- * No se agregó `ON UPDATE CASCADE` a las FK existentes: todas las PK
--   referenciadas son AUTO_INCREMENT o IDs de negocio inmutables una vez
--   creados, por lo que la cascada de UPDATE nunca dispararía en la práctica.
--   Agregarla exigiría recrear ~24 FKs (DROP + ADD) por un beneficio nulo,
--   aumentando el riesgo de la migración sin necesidad real.
-- * No se agregaron más `ON DELETE CASCADE`: los borrados en este backend son
--   lógicos (mascotas, y ahora organizaciones vía `activo`), por lo que las
--   cascadas de borrado físico no deberían dispararse en operación normal.
-- * `mensajes` y `seguimientos_adopcion` NO requirieron columna de borrado
--   lógico adicional: `mensajes` ya tiene semántica de estado suficiente
--   (leido) para el alcance actual, y los seguimientos se preservan como
--   evidencia (no se exponen operaciones de borrado físico sin revisión).
-- =============================================================================
