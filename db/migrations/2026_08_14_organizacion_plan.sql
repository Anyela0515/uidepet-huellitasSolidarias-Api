-- Primer paso de los planes de suscripción para fundaciones: el plan
-- "basico" (gratuito) limita cuántas mascotas activas puede tener publicadas
-- una organización a la vez. Los planes pagos ("aliado", "impulso") no
-- tienen límite. Toda organización existente arranca en "basico".

ALTER TABLE organizaciones
  ADD COLUMN plan ENUM('basico', 'aliado', 'impulso') NOT NULL DEFAULT 'basico' AFTER activo;
