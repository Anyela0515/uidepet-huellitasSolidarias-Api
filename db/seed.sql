USE huellitas_solidarias_db;

INSERT INTO usuarios (nombre, email, password, rol, telefono) VALUES
('María Fernanda Torres', 'maria.torres@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0991234567'),
('Dilan Gálvez', 'dilan.galvez@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0987654321'),
('Felix Rodas', 'felix.rodas@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0971122334'),
('Paula Rojas', 'paula.rojas@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0964455667'),
('Camila Vega', 'camila.vega@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0957788990'),
('Luis Ramírez', 'luis.ramirez@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0993344556'),
('Valentina Ruiz', 'valentina.ruiz@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0982211445'),
('Andrés Mora', 'andres.mora@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0976677889'),
('Sofía Mendoza', 'sofia.mendoza@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0968899001'),
('Diego Castillo', 'diego.castillo@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0953344112'),
('Jhosty Soto', 'jhosty.soto@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0994567890'),
('Steven Chininin', 'steven.chininin@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0986543210'),
('Daniela Herrera', 'daniela.herrera@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0971112223'),
('Mateo Salinas', 'mateo.salinas@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0963334445'),
('Carolina Pineda', 'carolina.pineda@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'adoptante', '0955556667'),
('Fundación Huellitas Solidarias', 'fundacion@huellitas.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'fundacion', '0998887766'),
('Refugio Patitas Loja', 'patitasloja@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'fundacion', '0987776655'),
('Fundación Amor Animal', 'amoranimal@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'fundacion', '0976665544'),
('Rescate Animal Loja', 'rescateanimal@correo.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'fundacion', '0965554433'),
('Administrador Sistema', 'admin@huellitas.com', '$2a$10$C6UzMDM.H6dfI/f/IKcEeO7LscM03nJ1GeFQq7jZxshPpQhK3J4pW', 'admin', '0990001122');

INSERT INTO fundaciones (nombre, ruc, ciudad, direccion, telefono, email, estado, usuario_id) VALUES
('Fundacion Huellitas Solidarias', '1190012345001', 'Loja', 'Av. Universitaria y Lourdes', '0998887766', 'fundacion@huellitas.com', 'aprobada', 16),
('Refugio Patitas Loja', '1190012345002', 'Loja', 'Barrio Las Pitas', '0987776655', 'patitasloja@correo.com', 'aprobada', 17),
('Fundación Amor Animal', '1190012345003', 'Catamayo', 'Vía antigua a Loja', '0976665544', 'amoranimal@correo.com', 'aprobada', 18),
('Rescate Animal Loja', '1190012345004', 'Loja', 'Sector Motupe', '0965554433', 'rescateanimal@correo.com', 'aprobada', 19);

INSERT INTO mascotas 
(nombre, especie, sexo, edad_meses, tamanio, color, descripcion, estado, esterilizado, vacunado, fundacion_id) VALUES
('Luna', 'perro', 'hembra', 18, 'mediano', 'Blanco con café', 'Cariñosa, tranquila y acostumbrada a convivir con personas.', 'disponible', true, true, 1),
('Max', 'perro', 'macho', 24, 'grande', 'Negro', 'Activo, juguetón y protector. Ideal para casa con patio.', 'disponible', true, true, 1),
('Mía', 'gato', 'hembra', 10, 'pequeno', 'Gris', 'Gatita dócil, limpia y muy sociable.', 'disponible', false, true, 1),
('Rocky', 'perro', 'macho', 36, 'grande', 'Café', 'Perro rescatado, noble y obediente.', 'en_revision', true, true, 1),
('Nala', 'perro', 'hembra', 14, 'mediano', 'Dorado', 'Le gusta caminar y convivir con niños.', 'disponible', true, true, 2),
('Toby', 'perro', 'macho', 8, 'pequeno', 'Blanco', 'Cachorro alegre, necesita familia paciente.', 'disponible', false, true, 2),
('Kira', 'gato', 'hembra', 20, 'pequeno', 'Negro', 'Independiente, tranquila y muy limpia.', 'disponible', true, true, 2),
('Simba', 'gato', 'macho', 12, 'pequeno', 'Naranja', 'Curioso, juguetón y acostumbrado a estar dentro de casa.', 'disponible', false, true, 2),
('Bruno', 'perro', 'macho', 30, 'grande', 'Café oscuro', 'Fuerte, cariñoso y necesita espacio amplio.', 'disponible', true, true, 3),
('Canela', 'perro', 'hembra', 28, 'mediano', 'Canela', 'Muy noble, rescatada de abandono.', 'disponible', true, true, 3),
('Pelusa', 'gato', 'hembra', 16, 'pequeno', 'Blanco', 'Gatita tranquila, ideal para departamento.', 'adoptado', true, true, 3),
('Zeus', 'perro', 'macho', 40, 'grande', 'Negro con blanco', 'Obediente y guardián, necesita familia responsable.', 'disponible', true, true, 3),
('Princesa', 'perro', 'hembra', 22, 'mediano', 'Miel', 'Cariñosa y sociable con otros perros.', 'disponible', true, true, 4),
('Oliver', 'gato', 'macho', 9, 'pequeno', 'Gris con blanco', 'Juguetón, curioso y muy cercano a las personas.', 'disponible', false, true, 4),
('Bella', 'perro', 'hembra', 34, 'mediano', 'Blanco', 'Tranquila, obediente y buena compañía.', 'en_revision', true, true, 4),
('Negra', 'perro', 'hembra', 26, 'mediano', 'Negro', 'Muy dulce, aunque al inicio es tímida.', 'disponible', true, true, 4),
('Copito', 'gato', 'macho', 18, 'pequeno', 'Blanco', 'Gato tranquilo, ideal para hogar calmado.', 'disponible', true, true, 1),
('Firulais', 'perro', 'macho', 15, 'mediano', 'Café claro', 'Juguetón, sociable y con mucha energía.', 'disponible', false, true, 2),
('Manchas', 'perro', 'macho', 32, 'grande', 'Blanco con negro', 'Rescatado de la calle, muy agradecido y dócil.', 'disponible', true, true, 3),
('Lola', 'gato', 'hembra', 11, 'pequeno', 'Tricolor', 'Gatita cariñosa, se adapta bien a interiores.', 'disponible', false, true, 4);

INSERT INTO solicitudes_adopcion
(usuario_id, mascota_id, tipo_vivienda, tiene_patio, tiene_mascotas, experiencia_mascotas, motivo_adopcion, estado) VALUES
(1, 1, 'casa', true, true, 'Ha tenido perros antes y conoce cuidados básicos.', 'Desea darle un hogar estable a una mascota rescatada.', 'aprobada'),
(2, 2, 'casa', true, false, 'Tuvo un perro familiar durante varios años.', 'Busca compañía y tiene espacio suficiente en casa.', 'en_revision'),
(3, 3, 'departamento', false, false, 'No ha tenido mascotas propias, pero su familia sí.', 'Quiere adoptar un gato porque puede cuidarlo dentro del hogar.', 'en_revision'),
(4, 5, 'casa', true, true, 'Tiene experiencia cuidando perros medianos.', 'Desea adoptar una perrita sociable para su familia.', 'aprobada'),
(5, 6, 'departamento', false, false, 'Primera adopción, recibió orientación de la fundación.', 'Quiere responsabilizarse por un cachorro rescatado.', 'en_revision'),
(6, 7, 'casa', true, true, 'Ha cuidado gatos y perros desde pequeña.', 'Busca adoptar una gata adulta porque suelen ser menos adoptadas.', 'aprobada'),
(7, 8, 'departamento', false, false, 'Tiene experiencia con gatos de interior.', 'Desea compañía en casa y puede cubrir sus cuidados.', 'en_revision'),
(8, 9, 'finca', true, true, 'Ha tenido perros grandes en una propiedad familiar.', 'Tiene espacio amplio para un perro grande.', 'aprobada'),
(9, 10, 'casa', true, false, 'Ha cuidado mascotas de familiares.', 'Quiere adoptar una mascota tranquila y responsablemente.', 'en_revision'),
(10, 12, 'casa', true, true, 'Tiene dos perros vacunados y esterilizados.', 'Desea integrar otro perro a su hogar.', 'rechazada'),
(11, 13, 'casa', true, false, 'Ha tenido una perrita anteriormente.', 'Busca compañía para su familia.', 'en_revision'),
(12, 14, 'departamento', false, false, 'Tiene experiencia básica con gatos.', 'Quiere adoptar un gato por su estilo de vida en departamento.', 'aprobada'),
(13, 16, 'casa', true, true, 'Ha rescatado animales temporalmente.', 'Desea adoptar una perrita que necesita oportunidad.', 'en_revision'),
(14, 17, 'departamento', false, false, 'Ha convivido con gatos en su familia.', 'Quiere adoptar un gato tranquilo para interiores.', 'en_revision'),
(15, 18, 'casa', true, false, 'Primera vez adoptando, pero cuenta con apoyo familiar.', 'Quiere cuidar una mascota y darle seguimiento adecuado.', 'en_revision'),
(1, 19, 'casa', true, true, 'Cuenta con espacio y experiencia con perros grandes.', 'Desea adoptar un perro rescatado de la calle.', 'en_revision'),
(2, 20, 'departamento', false, false, 'Ha cuidado gatos anteriormente.', 'Busca una mascota pequeña y tranquila.', 'aprobada'),
(3, 11, 'departamento', false, false, 'Tiene experiencia con gatos pequeños.', 'Deseaba adoptar una gatita ya adaptada a interiores.', 'aprobada'),
(4, 4, 'casa', true, true, 'Ha tenido perros adultos.', 'Quiere adoptar un perro noble y darle estabilidad.', 'cancelada'),
(5, 15, 'casa', true, false, 'Tiene disponibilidad de tiempo para cuidados.', 'Desea adoptar una mascota tranquila para compañía.', 'en_revision');

INSERT INTO seguimientos
(solicitud_id, fecha_visita, observacion, estado) VALUES
(1, '2026-07-10', 'Primera visita programada para verificar adaptación de Luna.', 'pendiente'),
(4, '2026-07-12', 'Seguimiento inicial para revisar convivencia de Nala.', 'pendiente'),
(6, '2026-07-15', 'Familia envió fotos y carnet de vacunación actualizado.', 'realizado'),
(8, '2026-07-18', 'Visita programada por tratarse de mascota grande.', 'pendiente'),
(12, '2026-07-20', 'Se verificará adaptación de Oliver en departamento.', 'pendiente'),
(17, '2026-07-22', 'Seguimiento posterior para revisar alimentación y cuidado.', 'pendiente'),
(18, '2026-07-25', 'Adopción completada, se solicita evidencia fotográfica.', 'pendiente');