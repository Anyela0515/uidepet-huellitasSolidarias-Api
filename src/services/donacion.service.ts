import * as donacionRepo from "../repositories/donacion.repository.js";

export async function listarDonaciones(rol: string, correo: string) {
  if (rol === "admin") return donacionRepo.findAll();
  return donacionRepo.findByCorreo(correo);
}

export async function crearDonacion(data: {
  nombre: string;
  correo: string;
  tipo: string;
  cantidad: string;
  direccion: string;
}) {
  const donacion = await donacionRepo.create(data);
  return { donacion };
}
