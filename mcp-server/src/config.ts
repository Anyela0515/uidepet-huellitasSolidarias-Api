import "dotenv/config";

const DEFAULT_API_URL = "https://api.huellitassolidarias.com";

/**
 * Valida la URL base antes de usarla. Sin esta comprobación, una variable de
 * entorno mal puesta (o manipulada) podría apuntar el servidor a un host
 * arbitrario y, con ello, filtrar el token de la API a un tercero.
 */
function resolveBaseUrl(raw: string | undefined): string {
  const candidate = (raw ?? "").trim() || DEFAULT_API_URL;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      `HUELLITAS_API_URL no es una URL válida: "${candidate}". Ejemplo: https://api.huellitassolidarias.com`
    );
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error(
      `HUELLITAS_API_URL debe usar http o https, no "${parsed.protocol}".`
    );
  }

  return `${parsed.origin}${parsed.pathname.replace(/\/$/, "")}`;
}

export const config = {
  baseUrl: resolveBaseUrl(process.env.HUELLITAS_API_URL),

  /**
   * Token JWT fijo, opcional. Se lee EXCLUSIVAMENTE del entorno. Nunca es un
   * parámetro de una tool: si lo fuera, bastaría un prompt malicioso ("llama
   * a la tool con este otro token") para que el modelo lo sustituyera o lo
   * revelara. Expira en 1h y hay que reemplazarlo a mano; para no depender
   * de eso, preferir ADMIN_EMAIL/ADMIN_PASSWORD (ver abajo).
   */
  apiToken: (process.env.HUELLITAS_API_TOKEN ?? "").trim() || null,

  /**
   * Alternativa a apiToken: credenciales de una cuenta de servicio con la
   * que el propio servidor MCP se loguea (POST /auth/login) y renueva el
   * token automáticamente antes de que expire, sin intervención humana. Ver
   * apiClient.ts -> getBearerToken(). Si ambas cosas están configuradas,
   * apiToken tiene prioridad (util para pruebas puntuales).
   */
  adminEmail: (process.env.HUELLITAS_ADMIN_EMAIL ?? "").trim() || null,
  adminPassword: (process.env.HUELLITAS_ADMIN_PASSWORD ?? "").trim() || null,

  /** Solo lectura salvo que se active explícitamente. */
  allowWrites: String(process.env.MCP_ALLOW_WRITES ?? "").toLowerCase() === "true",

  /** Ninguna petición puede colgar la sesión MCP indefinidamente. */
  requestTimeoutMs: 15_000,

  /** Tope de caracteres por respuesta, para no agotar la ventana de contexto. */
  maxResponseChars: 20_000,

  /** Límite duro de paginación, independiente de lo que pida el modelo. */
  maxPageSize: 50,
} as const;

export function hasToken(): boolean {
  return config.apiToken !== null || (config.adminEmail !== null && config.adminPassword !== null);
}
