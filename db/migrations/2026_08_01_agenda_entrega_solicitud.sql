-- Permite que la fundacion agende fecha, hora y lugar de entrega del
-- animal una vez aprobada la solicitud, en vez de solo un texto libre.
ALTER TABLE solicitudes_adopcion
  ADD COLUMN entrega_fecha DATE NULL AFTER proximo_paso,
  ADD COLUMN entrega_hora VARCHAR(5) NULL AFTER entrega_fecha,
  ADD COLUMN entrega_lugar VARCHAR(255) NULL AFTER entrega_hora;
