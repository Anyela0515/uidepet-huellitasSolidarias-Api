import * as catalogoRepo from "../repositories/catalogo.repository.js";

export const listarRoles = catalogoRepo.getRoles;
export const listarEstadosCuenta = catalogoRepo.getEstadosCuenta;
export const listarEspecies = catalogoRepo.getEspecies;
export const listarSexos = catalogoRepo.getSexos;
export const listarTamanos = catalogoRepo.getTamanos;
export const listarUnidadesEdad = catalogoRepo.getUnidadesEdad;
export const listarEstadosMascota = catalogoRepo.getEstadosMascota;
export const listarCiudades = catalogoRepo.getCiudades;
export const listarTags = catalogoRepo.getTags;
export const listarEstadosSolicitudAdopcion = catalogoRepo.getEstadosSolicitudAdopcion;
export const listarEstadosSolicitudOrganizacion =
  catalogoRepo.getEstadosSolicitudOrganizacion;
export const listarTiposVivienda = catalogoRepo.getTiposVivienda;
export const listarTiposDonacion = catalogoRepo.getTiposDonacion;
export const listarEstadosDonacion = catalogoRepo.getEstadosDonacion;
export const listarTiposMedio = catalogoRepo.getTiposMedio;

export function listarRazas(especieId?: number) {
  return catalogoRepo.getRazas(especieId);
}
