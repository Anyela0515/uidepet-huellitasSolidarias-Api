import * as fundacionRepo from "../repositories/fundacion.repository.js";
import * as authService from "./auth.service.js";

const DEFAULT_FUNDACION_PASSWORD = "Huellitas123";

export async function listarFundaciones() {
  return fundacionRepo.findAll();
}

export async function registrarFundacion(data: {
  nombre: string;
  organizacion?: string;
  ruc: string;
  representante: string;
  correo: string;
  telefono: string;
  ciudad: string;
  descripcion: string;
  documento?: string;
}) {
  const correo = data.correo.trim().toLowerCase();

  if (await fundacionRepo.existsByCorreo(correo)) {
    return { error: "Ya existe una solicitud con este correo." };
  }

  if (await fundacionRepo.existsByRuc(data.ruc.trim())) {
    return { error: "Ya existe una solicitud con este RUC." };
  }

  const fundacion = await fundacionRepo.create({ ...data, correo });
  return { fundacion };
}

export async function actualizarEstado(id: string, estado: string) {
  const fundacion = await fundacionRepo.findById(id);
  if (!fundacion) return { error: "Fundación no encontrada." };

  const updated = await fundacionRepo.updateEstado(id, estado);

  if (estado === "aprobada" && updated) {
    await authService.createFundacionUser({
      correo: updated.correo,
      nombre: updated.representante || updated.nombre,
      telefono: updated.telefono,
      organizacion: updated.organizacion || updated.nombre,
      password: DEFAULT_FUNDACION_PASSWORD,
      ruc: updated.ruc,
      ciudad: updated.ciudad,
      descripcion: updated.descripcion,
    });
  }

  return { fundacion: updated };
}
