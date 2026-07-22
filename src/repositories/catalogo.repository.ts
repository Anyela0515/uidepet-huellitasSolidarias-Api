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

async function listSimple(table: string): Promise<CatalogoItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre FROM ${table} ORDER BY nombre ASC`
  );
  return rows.map((row) => ({ id: Number(row.id), nombre: String(row.nombre) }));
}

async function listCategoriaPorTipo(tipo: string): Promise<CatalogoItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, nombre FROM categorias WHERE tipo = ? ORDER BY nombre ASC",
    [tipo]
  );
  return rows.map((row) => ({ id: Number(row.id), nombre: String(row.nombre) }));
}

async function listConCodigo(table: string): Promise<CatalogoItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, codigo, nombre FROM ${table} ORDER BY nombre ASC`
  );
  return rows.map((row) => ({
    id: Number(row.id),
    codigo: String(row.codigo),
    nombre: String(row.nombre),
  }));
}

export const getRoles = () => listConCodigo("roles");
export const getEstadosCuenta = () => listConCodigo("estados_cuenta");
export const getEspecies = () => listCategoriaPorTipo("especie");
export const getSexos = () => listCategoriaPorTipo("sexo");
export const getTamanos = () => listCategoriaPorTipo("tamano");
export const getUnidadesEdad = () => listCategoriaPorTipo("unidad_edad");
export const getEstadosMascota = () => listConCodigo("estados_mascota");
export const getCiudades = () => listSimple("ciudades");
export const getTags = () => listSimple("tags");
export const getEstadosSolicitudAdopcion = () => listConCodigo("estados_solicitud_adopcion");
export const getEstadosSolicitudOrganizacion = () =>
  listConCodigo("estados_solicitud_organizacion");
export const getTiposVivienda = () => listSimple("tipos_vivienda");
export const getTiposDonacion = () => listSimple("tipos_donacion");
export const getEstadosDonacion = () => listConCodigo("estados_donacion");
export const getTiposMedio = () => listConCodigo("tipos_medio");

export async function getRazas(especieId?: number): Promise<RazaItem[]> {
  const [rows] = await pool.query<RowDataPacket[]>(
    especieId
      ? "SELECT id, padre_id AS especie_id, nombre FROM categorias WHERE tipo = 'raza' AND padre_id = ? ORDER BY nombre ASC"
      : "SELECT id, padre_id AS especie_id, nombre FROM categorias WHERE tipo = 'raza' ORDER BY nombre ASC",
    especieId ? [especieId] : []
  );
  return rows.map((row) => ({
    id: Number(row.id),
    especieId: Number(row.especie_id),
    nombre: String(row.nombre),
  }));
}
