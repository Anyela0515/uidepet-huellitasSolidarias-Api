-- Telefono de contacto especifico para coordinar la entrega, ademas del
-- telefono general de la organizacion en su configuracion.
ALTER TABLE solicitudes_adopcion
  ADD COLUMN entrega_contacto VARCHAR(20) NULL AFTER entrega_lugar;
