-- =============================================================================
-- Migración: triggers de inmutabilidad para auditoria (2026-08-07)
-- =============================================================================
-- Separada de 2026_08_05_auditoria_inmutable.sql: crear un trigger con
-- binary logging activado (siempre activo en RDS) requiere el privilegio
-- SUPER, que el usuario admin de RDS no tiene por defecto. Hace falta
-- primero activar log_bin_trust_function_creators=1 en un grupo de
-- parámetros propio (el grupo por defecto de AWS no se puede editar) y
-- asociarlo a la instancia. Aditiva e idempotente.
-- =============================================================================

-- Sin BEGIN...END ni DELIMITER a propósito: el runner de migraciones manda
-- el archivo tal cual vía mysql2 con multipleStatements, que no entiende
-- DELIMITER (eso es un truco exclusivo del cliente `mysql` de línea de
-- comandos, el servidor no lo conoce). Un solo statement en el cuerpo del
-- trigger no necesita BEGIN/END, así que no hay un ";" interno que confunda
-- el split de multi-statement.
DROP TRIGGER IF EXISTS trg_auditoria_no_update;
DROP TRIGGER IF EXISTS trg_auditoria_no_delete;

CREATE TRIGGER trg_auditoria_no_update
BEFORE UPDATE ON auditoria
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tabla auditoria es de solo lectura: no se permite UPDATE.';

CREATE TRIGGER trg_auditoria_no_delete
BEFORE DELETE ON auditoria
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La tabla auditoria es de solo lectura: no se permite DELETE.';
