import "dotenv/config";

/**
 * Config exclusiva del modo remoto (Streamable HTTP). El modo stdio (config.ts)
 * no la necesita: no tiene sentido "loguearse" en un proceso que solo tu propia
 * máquina puede lanzar.
 *
 * En esta rama (main) NO hay passcode de equipo ni claves de API fijas: cada
 * persona se autentica con su propia cuenta de Huellitas Solidarias al
 * conectarse (ver src/auth/userLoginOAuthProvider.ts). Esas variantes siguen
 * existiendo en la rama mcp-admin-full-access, para el caso de acceso
 * administrativo compartido.
 */
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
      `MCP_PUBLIC_URL debe ser https (el token del backend viaja en la respuesta del login), salvo en localhost para pruebas: "${candidate}".`
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

  /** Origenes de navegador permitidos a llamar /mcp. Clientes no-navegador
   * (Claude Desktop) no mandan Origin, así que no los bloquea esta lista. */
  allowedOrigins: (process.env.MCP_ALLOWED_ORIGINS ?? "https://claude.ai")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
} as const;
