-- Dos cambios relacionados con el flujo de rescate:
--
-- 1. organizacion_atiende_id: hasta ahora, un reporte se notificaba a TODAS
--    las fundaciones y cualquiera podia cambiar su estado sin coordinacion,
--    asi que dos fundaciones podian terminar atendiendo (o pisandose) el
--    mismo caso sin saberlo. La primera fundacion que toca el estado del
--    reporte lo "reclama" (se guarda aqui su organizacion); mientras quede
--    reclamado, ninguna otra fundacion puede cambiar su estado (un admin si
--    puede, siempre).
--
-- 2. archivos.categoria: la tabla archivos ya guardaba las fotos que el
--    ciudadano adjunta al reportar. Ahora tambien debe guardar las fotos que
--    la fundacion sube como evidencia de que el animal fue rescatado, y hay
--    que poder distinguir un tipo de otro al leerlas de vuelta.

ALTER TABLE denuncias_rescate
  ADD COLUMN organizacion_atiende_id INT UNSIGNED NULL AFTER estado_id,
  ADD CONSTRAINT fk_denuncia_organizacion_atiende
    FOREIGN KEY (organizacion_atiende_id) REFERENCES organizaciones(id);

ALTER TABLE archivos
  ADD COLUMN categoria VARCHAR(20) NOT NULL DEFAULT 'reporte' AFTER denuncia_id;
