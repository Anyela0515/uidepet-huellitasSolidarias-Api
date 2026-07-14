import * as mensajeRepo from "../repositories/mensaje.repository.js";

export async function listarMensajes(rol: string, correo: string) {
  if (rol === "fundacion") return mensajeRepo.findByFundacion(correo);
  return mensajeRepo.findAll();
}

export async function crearMensaje(data: {
  de: string;
  correo: string;
  asunto: string;
  mensaje: string;
  solicitudId?: string | null;
  fundacionEmail?: string | null;
}) {
  const mensaje = await mensajeRepo.create(data);
  return { mensaje };
}

export async function marcarLeido(id: string) {
  await mensajeRepo.markAsRead(id);
  return { ok: true };
}
