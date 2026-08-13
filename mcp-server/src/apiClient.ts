import { config } from "./config.js";

export class ApiCallError extends Error {
  constructor(
    message: string,
    readonly status?: number
  ) {
    super(message);
    this.name = "ApiCallError";
  }
}

function stripBinaryPayloads(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.startsWith("data:") && value.length > 256) {
      const mime = value.slice(5, value.indexOf(";")) || "desconocido";
      const bytes = Math.ceil(((value.split(",")[1] ?? "").length * 3) / 4);
      const kb = (bytes / 1024).toFixed(1);
      return `[archivo omitido — ${mime}, ~${kb} KB]`;
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(stripBinaryPayloads);
  }

  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = stripBinaryPayloads(val);
    }
    return out;
  }

  return value;
}

function sanitizeErrorMessage(raw: string): string {
  const limpio = raw.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [oculto]");
  return limpio.length > 400 ? `${limpio.slice(0, 400)}…` : limpio;
}

interface CachedToken {
  token: string;
  expiresAtMs: number;
}

let cachedLoginToken: CachedToken | null = null;

function decodeJwtExpiryMs(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { exp?: number };
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

async function getBearerToken(): Promise<string> {
  if (config.apiToken) return config.apiToken;

  if (!config.adminEmail || !config.adminPassword) {
    throw new ApiCallError(
      "Esta operación requiere autenticación, pero no hay HUELLITAS_API_TOKEN ni " +
        "HUELLITAS_ADMIN_EMAIL/HUELLITAS_ADMIN_PASSWORD configurados en el entorno del servidor MCP."
    );
  }

  const margenMs = 60_000;
  if (cachedLoginToken && cachedLoginToken.expiresAtMs - margenMs > Date.now()) {
    return cachedLoginToken.token;
  }

  const url = new URL(`${config.baseUrl}/auth/login`);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ correo: config.adminEmail, password: config.adminPassword }),
      signal: controller.signal,
    });
  } catch (error) {
    const detalle = error instanceof Error ? error.message : String(error);
    throw new ApiCallError(`No se pudo autenticar la cuenta de servicio: ${sanitizeErrorMessage(detalle)}`);
  } finally {
    clearTimeout(timeout);
  }

  const datos: unknown = await response.json().catch(() => null);
  const tieneToken =
    datos !== null && typeof datos === "object" && "token" in datos && typeof (datos as { token: unknown }).token === "string";

  if (!response.ok || !tieneToken) {
    const mensaje =
      datos && typeof datos === "object" && "error" in datos
        ? String((datos as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new ApiCallError(`No se pudo autenticar la cuenta de servicio: ${sanitizeErrorMessage(mensaje)}`);
  }

  const token = (datos as { token: string }).token;
  const expiresAtMs = decodeJwtExpiryMs(token) ?? Date.now() + 55 * 60 * 1000;
  cachedLoginToken = { token, expiresAtMs };
  return token;
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;

  auth?: boolean | string;
}

export async function apiRequest(
  method: "GET" | "POST" | "PATCH",
  path: string,
  options: RequestOptions = {}
): Promise<unknown> {
  const url = new URL(`${config.baseUrl}${path}`);

  for (const [key, val] of Object.entries(options.query ?? {})) {
    if (val !== undefined && val !== "") {
      url.searchParams.set(key, String(val));
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.auth) {
    const token = typeof options.auth === "string" ? options.auth : await getBearerToken();
    headers.Authorization = `Bearer ${token}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiCallError(
        `La API no respondió en ${config.requestTimeoutMs / 1000}s (${method} ${path}).`
      );
    }
    const detalle = error instanceof Error ? error.message : String(error);
    throw new ApiCallError(
      `No se pudo contactar la API en ${config.baseUrl}: ${sanitizeErrorMessage(detalle)}`
    );
  } finally {
    clearTimeout(timeout);
  }

  const texto = await response.text();
  let datos: unknown = null;
  if (texto) {
    try {
      datos = JSON.parse(texto);
    } catch {
      datos = texto;
    }
  }

  if (!response.ok) {
    const mensajeApi =
      datos && typeof datos === "object" && "error" in datos
        ? String((datos as { error: unknown }).error)
        : `HTTP ${response.status}`;
    throw new ApiCallError(sanitizeErrorMessage(mensajeApi), response.status);
  }

  return stripBinaryPayloads(datos);
}

export function formatForModel(datos: unknown): string {
  const json = JSON.stringify(datos, null, 2);
  if (json.length <= config.maxResponseChars) return json;
  return `${json.slice(0, config.maxResponseChars)}\n\n[…respuesta truncada: superó ${config.maxResponseChars} caracteres. Usa filtros o un "limit" menor para acotarla.]`;
}
