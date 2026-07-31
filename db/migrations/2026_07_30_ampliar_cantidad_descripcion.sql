-- El campo de descripción de la donación pasó a ser multilínea en el
-- formulario, pero la columna seguía limitada a 120 caracteres y truncaba
-- el guardado con un error de base de datos.

ALTER TABLE donaciones MODIFY COLUMN cantidad_descripcion VARCHAR(500) NOT NULL;
