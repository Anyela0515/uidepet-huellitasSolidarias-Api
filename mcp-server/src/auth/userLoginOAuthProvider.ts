import { randomUUID } from "node:crypto";
import type { Response } from "express";
import type {
  OAuthServerProvider,
  AuthorizationParams,
} from "@modelcontextprotocol/sdk/server/auth/provider.js";
import type { OAuthRegisteredClientsStore } from "@modelcontextprotocol/sdk/server/auth/clients.js";
import type {
  OAuthClientInformationFull,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { InvalidRequestError, InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import { config } from "../config.js";

interface StoredCode {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
  backendToken: string;
}

interface StoredToken {
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
  backendToken: string;
}

class InMemoryClientsStore implements OAuthRegisteredClientsStore {
  private clients = new Map<string, OAuthClientInformationFull>();

  async getClient(clientId: string) {
    return this.clients.get(clientId);
  }

  async registerClient(clientMetadata: OAuthClientInformationFull) {
    this.clients.set(clientMetadata.client_id, clientMetadata);
    return clientMetadata;
  }
}

function renderLoginForm(opts: { action: string; error?: string; correo?: string }): string {
  const errorHtml = opts.error
    ? `<p style="color:#b00020;font-weight:600;margin:0 0 16px">${opts.error}</p>`
    : "";
  const correoValue = opts.correo ? ` value="${opts.correo.replace(/"/g, "&quot;")}"` : "";
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Huellitas Solidarias — Acceso al servidor MCP</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, sans-serif; background: #f8f9fa; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; }
  form { background: #fff; border: 1px solid #ececec; border-radius: 14px; padding: 32px; width: 100%; max-width: 380px; }
  h1 { font-size: 1.1rem; color: #800040; margin: 0 0 8px; }
  p.sub { color: #666; font-size: 0.85rem; margin: 0 0 20px; }
  label { display: block; font-size: 0.8rem; font-weight: 700; margin: 0 0 6px; }
  input { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; margin-bottom: 16px; }
  button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #800040; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
  button:hover { background: #6B003C; }
</style>
</head>
<body>
  <form method="POST" action="${opts.action}">
    <h1>Huellitas Solidarias</h1>
    <p class="sub">Ingresa tu correo y contraseña de Huellitas Solidarias. Verás exactamente lo que tu cuenta puede ver.</p>
    ${errorHtml}
    <label>Correo</label>
    <input type="email" name="correo" placeholder="tu@correo.com"${correoValue} autofocus required />
    <label>Contraseña</label>
    <input type="password" name="password" placeholder="Contraseña" required />
    <button type="submit">Autorizar</button>
  </form>
</body>
</html>`;
}

export class UserLoginOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new InMemoryClientsStore();
  private codes = new Map<string, StoredCode>();
  private tokens = new Map<string, StoredToken>();
  private pending = new Map<string, { client: OAuthClientInformationFull; params: AuthorizationParams }>();

  async authorize(
    client: OAuthClientInformationFull,
    params: AuthorizationParams,
    res: Response
  ): Promise<void> {
    if (!client.redirect_uris.includes(params.redirectUri)) {
      throw new InvalidRequestError("Unregistered redirect_uri");
    }

    const pendingId = randomUUID();
    this.pending.set(pendingId, { client, params });

    res
      .status(200)
      .type("html")
      .send(renderLoginForm({ action: `/authorize/submit?pending=${pendingId}` }));
  }

  async handleLoginSubmit(
    pendingId: string,
    correo: string,
    password: string,
    res: Response
  ): Promise<void> {
    const entry = this.pending.get(pendingId);
    if (!entry) {
      res.status(400).type("html").send(renderLoginForm({
        action: "/authorize",
        error: "La sesión de autorización expiró. Vuelve a intentarlo desde tu cliente MCP.",
      }));
      return;
    }
    this.pending.delete(pendingId);

    let backendToken: string;
    try {
      const loginResp = await fetch(new URL("/auth/login", config.baseUrl), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ correo, password }),
      });
      const datos: unknown = await loginResp.json().catch(() => null);
      const tieneToken =
        datos !== null && typeof datos === "object" && "token" in datos && typeof (datos as { token: unknown }).token === "string";
      if (!loginResp.ok || !tieneToken) {
        this.pending.set(pendingId, entry);
        res.status(401).type("html").send(renderLoginForm({
          action: `/authorize/submit?pending=${pendingId}`,
          error: "Correo o contraseña incorrectos.",
          correo,
        }));
        return;
      }
      backendToken = (datos as { token: string }).token;
    } catch {
      this.pending.set(pendingId, entry);
      res.status(502).type("html").send(renderLoginForm({
        action: `/authorize/submit?pending=${pendingId}`,
        error: "No se pudo contactar la API de Huellitas Solidarias. Intenta de nuevo.",
        correo,
      }));
      return;
    }

    const code = randomUUID();
    this.codes.set(code, { ...entry, backendToken });

    const target = new URL(entry.params.redirectUri);
    target.searchParams.set("code", code);
    if (entry.params.state !== undefined) {
      target.searchParams.set("state", entry.params.state);
    }
    res.redirect(target.toString());
  }

  async challengeForAuthorizationCode(
    _client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<string> {
    const codeData = this.codes.get(authorizationCode);
    if (!codeData) throw new Error("Invalid authorization code");
    return codeData.params.codeChallenge;
  }

  async exchangeAuthorizationCode(
    client: OAuthClientInformationFull,
    authorizationCode: string
  ): Promise<OAuthTokens> {
    const codeData = this.codes.get(authorizationCode);
    if (!codeData) throw new Error("Invalid authorization code");
    if (codeData.client.client_id !== client.client_id) {
      throw new Error("Authorization code was not issued to this client");
    }
    this.codes.delete(authorizationCode);

    const token = randomUUID();
    const expiresIn = 3600;
    this.tokens.set(token, {
      clientId: client.client_id,
      scopes: codeData.params.scopes ?? [],
      expiresAt: Date.now() + expiresIn * 1000,
      resource: codeData.params.resource,
      backendToken: codeData.backendToken,
    });

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
      scope: (codeData.params.scopes ?? []).join(" "),
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {

    throw new Error("Refresh tokens no soportados: vuelve a autorizar la conexión.");
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    const data = this.tokens.get(token);
    if (!data || data.expiresAt < Date.now()) {
      throw new InvalidTokenError("Invalid or expired token");
    }
    return {
      token,
      clientId: data.clientId,
      scopes: data.scopes,
      expiresAt: Math.floor(data.expiresAt / 1000),
      resource: data.resource,
      extra: { backendToken: data.backendToken },
    };
  }
}
