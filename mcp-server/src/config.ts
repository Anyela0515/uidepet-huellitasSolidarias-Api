import "dotenv/config";

const DEFAULT_API_URL = "https://api.huellitassolidarias.com";

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

  apiToken: (process.env.HUELLITAS_API_TOKEN ?? "").trim() || null,

  adminEmail: (process.env.HUELLITAS_ADMIN_EMAIL ?? "").trim() || null,
  adminPassword: (process.env.HUELLITAS_ADMIN_PASSWORD ?? "").trim() || null,

  allowWrites: String(process.env.MCP_ALLOW_WRITES ?? "").toLowerCase() === "true",

  requestTimeoutMs: 15_000,

  maxResponseChars: 20_000,

  maxPageSize: 50,
} as const;

export function hasToken(): boolean {
  return config.apiToken !== null || (config.adminEmail !== null && config.adminPassword !== null);
}
