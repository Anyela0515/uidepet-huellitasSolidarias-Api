-- Permite que quien reporta un rescate deje (opcionalmente) un correo para
-- recibir aviso automático cuando la fundación actualice el estado de su
-- reporte, sin dejar de ser un formulario anónimo por defecto.

ALTER TABLE denuncias_rescate
  ADD COLUMN correo_notificacion VARCHAR(150) NULL AFTER contacto;
