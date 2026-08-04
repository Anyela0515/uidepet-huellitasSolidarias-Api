import "dotenv/config";

/**
 * Config exclusiva del modo remoto (Streamable HTTP). El modo stdio (config.ts)
 * no la necesita: no tiene sentido "loguearse" en un proceso que solo tu propia
 * máquina puede lanzar.
 */
function required(name: string): string {
  const value = (process.env[name] ?? "").trim();
  if (!value) {
    throw new Error(
      `${name} es obligatoria para el modo remoto (MCP_TRANSPORT=http). Define un valor largo y aleatorio en el entorno del servidor.`
    );
  }
  return value;
}

function resolvePublicUrl(raw: string | undefined): URL {
  const candidate = (raw ?? "").trim();
  if (!candidate) {
    throw new Error(
      "MCP_PUBLIC_URL es obligatoria para el modo remoto: la URL pública completa por la que se llega a este servidor, p. ej. https://huellitassolidarias.com/mcp"
    );
  }
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`MCP_PUBLIC_URL no es una URL válida: "${candidate}".`);
  }
  const esLocal = ["localhost", "127.0.0.1"].includes(parsed.hostname);
  if (parsed.protocol !== "https:" && !(esLocal && parsed.protocol === "http:")) {
    throw new Error(
      `MCP_PUBLIC_URL debe ser https (el token viaja en la respuesta del login), salvo en localhost para pruebas: "${candidate}".`
    );
  }
  return parsed;
}

export const httpConfig = {
  port: Number(process.env.PORT ?? 3002),

  /**
   * URL pública completa del endpoint /mcp, p. ej. https://huellitassolidarias.com/mcp.
   * Se usa como "resource" en el token OAuth (RFC 8707) y para construir los
   * metadatos de descubrimiento.
   */
  publicUrl: resolvePublicUrl(process.env.MCP_PUBLIC_URL),

  /**
   * Clave compartida que el equipo usa para "iniciar sesión" en la pantalla de
   * autorización OAuth. No es una cuenta de usuario real: es un portón único
   * para todo el equipo, del mismo tipo que ya usa /docs en el backend
   * (DOCS_USER/DOCS_PASSWORD) para Swagger UI.
   */
  accessPasscode: required("MCP_ACCESS_PASSCODE"),

  /** Origenes de navegador permitidos a llamar /mcp. Clientes no-navegador
   * (Claude Desktop) no mandan Origin, así que no los bloquea esta lista. */
  allowedOrigins: (process.env.MCP_ALLOWED_ORIGINS ?? "https://claude.ai")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),

  /**
   * Claves de API fijas (no expiran), para clientes que no hacen el login
   * OAuth interactivo y solo pueden mandar un bearer token constante desde
   * una variable de entorno propia (p. ej. Codex). Opcional: si no se
   * define, este modo simplemente no existe y /mcp solo acepta tokens
   * emitidos por el flujo OAuth normal (con passcode, expiran en 1h).
   * Formato: una o mas claves separadas por coma, para poder revocar una
   * sola sin afectar a las demas.
   */
  staticApiKeys: (process.env.MCP_STATIC_API_KEYS ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean),
} as const;
