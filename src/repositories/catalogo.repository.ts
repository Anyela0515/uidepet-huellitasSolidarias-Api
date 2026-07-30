import { pool } from "../config/database.js";
import type { RowDataPacket } from "mysql2";

export interface CatalogoItem {
  id: number;
  codigo?: string;
  nombre: string;
}

export interface RazaItem extends CatalogoItem {
  especieId: number;
}

async function listPorTipoNombre(tipo: string): Promise<CatalogoItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre FROM catalogos WHERE tipo = ? ORDER BY nombre ASC",
    [tipo]
  );
  return rows.map((row) => ({ id: Number(row.id), nombre: String(row.nombre) }));
}

// Estos catálogos no guardan un `nombre` propio (ver schema.sql): siempre
// terminaba siendo el mismo texto que `codigo`. Se sigue devolviendo
// `nombre` en la respuesta para no romper el contrato de este endpoint.
async function listPorTipoCodigo(tipo: string): Promise<CatalogoItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, codigo FROM catalogos WHERE tipo = ? ORDER BY codigo ASC",
    [tipo]
  );
  return rows.map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo),
    nombre: String(row.codigo),
  }));
}

export const getRoles = () => listPorTipoCodigo("rol");
export const getEstadosCuenta = () => listPorTipoCodigo("estado_cuenta");
export const getEspecies = () => listPorTipoNombre("especie");
export const getSexos = () => listPorTipoNombre("sexo");
export const getTamanos = () => listPorTipoNombre("tamano");
export const getUnidadesEdad = () => listPorTipoNombre("unidad_edad");
export const getEstadosMascota = () => listPorTipoCodigo("estado_mascota");
export const getCiudades = () => listPorTipoNombre("ciudad");
export const getTags = () => listPorTipoNombre("tag");
export const getEstadosSolicitudAdopcion = () => listPorTipoCodigo("estado_solicitud_adopcion");
export const getEstadosSolicitudOrganizacion = () =>
  listPorTipoCodigo("estado_solicitud_organizacion");
export const getTiposVivienda = () => listPorTipoNombre("tipo_vivienda");
export const getTiposDonacion = () => listPorTipoNombre("tipo_donacion");
export const getEstadosDonacion = () => listPorTipoCodigo("estado_donacion");
export const getTiposMedio = () => listPorTipoCodigo("tipo_medio");

export async function getRazas(especieId?: number): Promise<RazaItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    especieId
      ? "SELECT id, padre_id AS especie_id, nombre FROM catalogos WHERE tipo = 'raza' AND padre_id = ? ORDER BY nombre ASC"
      : "SELECT id, padre_id AS especie_id, nombre FROM catalogos WHERE tipo = 'raza' ORDER BY nombre ASC",
    especieId ? [especieId] : []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    especieId: Number(row.especie_id),
    nombre: String(row.nombre),
  }));
}
