/**
 * Ejemplo orientativo de integración del frontend (React) con la API de
 * Huellitas Solidarias. No es parte del build del backend — solo documentación.
 *
 * Ver docs/api/ENDPOINTS_FRONTEND.md para el detalle completo de cada ruta.
 */
import axios, { type AxiosError } from "axios";

// -----------------------------------------------------------------------
// Instancia base
// -----------------------------------------------------------------------
// Sin prefijo /api/v1: las rutas reales cuelgan de la raíz (ver ENDPOINTS_FRONTEND.md).
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

// -----------------------------------------------------------------------
// Interceptor: adjunta el JWT guardado en localStorage
// -----------------------------------------------------------------------
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// -----------------------------------------------------------------------
// Interceptor: maneja 401 (token inválido/expirado) globalmente
// -----------------------------------------------------------------------
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      // Redirige a login o dispara un evento global de "sesión expirada",
      // según el router que use el frontend.
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// -----------------------------------------------------------------------
// Tipos mínimos del contrato (coinciden con src/types/frontend.ts del backend)
// -----------------------------------------------------------------------
export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: "usuario" | "fundacion" | "admin";
  estado: string;
}

export interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  edad: string;
  sexo: string;
  tamano: string;
  ubicacion: string;
  imagen: string;
  fundacion: string;
  estado: string;
  hidden: boolean;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface PaginatedResponse<T> {
  success: true;
  data: T[];
  pagination: PaginationMeta;
}

// -----------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------
export async function login(correo: string, password: string) {
  const { data } = await api.post<{ token: string; usuario: Usuario }>("/auth/login", {
    correo,
    password,
  });
  localStorage.setItem("token", data.token);
  return data.usuario;
}

export async function logout() {
  localStorage.removeItem("token");
}

// -----------------------------------------------------------------------
// Mascotas — listado paginado con filtros
// -----------------------------------------------------------------------
export async function listarMascotas(params: {
  page?: number;
  limit?: number;
  search?: string;
  especie?: string;
  ciudad?: string;
  sortBy?: "nombre" | "fecha" | "ciudad";
  sortOrder?: "asc" | "desc";
}) {
  const { data } = await api.get<PaginatedResponse<Mascota>>("/mascotas/publicas", {
    params,
  });
  return data; // { data: Mascota[], pagination }
}

export async function obtenerMascota(id: number) {
  const { data } = await api.get<{ success: true; data: Mascota }>(`/mascotas/${id}`);
  return data.data;
}

// -----------------------------------------------------------------------
// Favoritos (requiere sesión con rol "usuario")
// -----------------------------------------------------------------------
export async function agregarFavorito(mascotaId: number) {
  await api.post(`/favoritos/${mascotaId}`);
}

export async function quitarFavorito(mascotaId: number) {
  await api.delete(`/favoritos/${mascotaId}`);
}

export async function listarFavoritos() {
  const { data } = await api.get<{ success: true; data: Mascota[] }>("/favoritos");
  return data.data;
}

// -----------------------------------------------------------------------
// Solicitudes de adopción
// -----------------------------------------------------------------------
export async function crearSolicitudAdopcion(petId: number, form: Record<string, unknown>) {
  const { data } = await api.post("/solicitudes", { petId, form });
  return data;
}

export async function misSolicitudes(params: { page?: number; limit?: number; estado?: string }) {
  const { data } = await api.get("/solicitudes", { params });
  return data;
}
