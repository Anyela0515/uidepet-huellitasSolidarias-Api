import "dotenv/config";

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

  publicUrl: resolvePublicUrl(process.env.MCP_PUBLIC_URL),

  allowedOrigins: (process.env.MCP_ALLOWED_ORIGINS ?? "https://claude.ai")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
} as const;
