-- Elimina la provincia de Galápagos y toda su jerarquía (cantones y
-- parroquias) del catálogo de localidades. La logística de transporte de
-- mascotas hacia las islas hace inviable la adopción a distancia, así que
-- no tiene sentido ofrecerla como opción en los formularios.
--
-- Verificado antes de escribir esta migración: ninguna organización,
-- solicitud de registro de organización ni solicitud de adopción usa
-- actualmente una localidad de Galápagos, así que no hay referencias que
-- se queden huérfanas.
--
-- DELETE en vez de guard con IF EXISTS: si ya se corrió, simplemente no
-- afecta ninguna fila (no es un error como sí lo sería un ALTER repetido).

DELETE par FROM catalogos par
  INNER JOIN catalogos cant ON cant.id = par.padre_id AND cant.tipo = 'canton'
  INNER JOIN catalogos prov ON prov.id = cant.padre_id AND prov.tipo = 'provincia'
WHERE par.tipo = 'parroquia' AND prov.nombre = 'GALAPAGOS';

DELETE cant FROM catalogos cant
  INNER JOIN catalogos prov ON prov.id = cant.padre_id AND prov.tipo = 'provincia'
WHERE cant.tipo = 'canton' AND prov.nombre = 'GALAPAGOS';

DELETE FROM catalogos WHERE tipo = 'provincia' AND nombre = 'GALAPAGOS';
