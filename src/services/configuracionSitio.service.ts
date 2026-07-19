import * as configRepo from "../repositories/configuracionSitio.repository.js";
import { ActualizarConfiguracionSitioDTO } from "../schemas/configuracionSitio.schema.js";
import { NotFoundError } from "../utils/errors.js";

export async function obtenerConfiguracion() {
  const config = await configRepo.get();
  if (!config) {
    throw new NotFoundError("La configuración del sitio no está inicializada.");
  }
  return config;
}

export async function actualizarConfiguracion(data: ActualizarConfiguracionSitioDTO) {
  return configRepo.update(data);
}
