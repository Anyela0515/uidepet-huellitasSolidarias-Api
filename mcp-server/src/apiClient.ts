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

/**
 * La API guarda imágenes, videos y comprobantes como data URLs en base64
 * dentro del propio JSON. Un solo comprobante puede pesar cientos de KB, así
 * que devolverlos tal cual llenaría la ventana de contexto del modelo y haría
 * inutilizable la respuesta. Se sustituyen por un resumen legible.
 */
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

/** Evita que un mensaje de error arrastre el token o cabeceras internas. */
function sanitizeErrorMessage(raw: string): string {
  const limpio = raw.replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [oculto]");
  return limpio.length > 400 ? `${limpio.slice(0, 400)}…` : limpio;
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  /** Adjunta el token del entorno. Falla si no hay token configurado. */
  auth?: boolean;
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
    if (!config.apiToken) {
      throw new ApiCallError(
        "Esta operación requiere autenticación, pero HUELLITAS_API_TOKEN no está configurado en el entorno del servidor MCP."
      );
    }
    headers.Authorization = `Bearer ${config.apiToken}`;
  }

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Sin timeout, una API caída dejaría la conversación colgada sin respuesta.
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

/** Serializa para el modelo, recortando si excede el tope configurado. */
export function formatForModel(datos: unknown): string {
  const json = JSON.stringify(datos, null, 2);
  if (json.length <= config.maxResponseChars) return json;
  return `${json.slice(0, config.maxResponseChars)}\n\n[…respuesta truncada: superó ${config.maxResponseChars} caracteres. Usa filtros o un "limit" menor para acotarla.]`;
}
