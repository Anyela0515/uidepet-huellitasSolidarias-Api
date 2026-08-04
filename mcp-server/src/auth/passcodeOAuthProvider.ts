import { randomUUID, timingSafeEqual } from "node:crypto";
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
import { httpConfig } from "../httpConfig.js";

/**
 * Basado en el DemoInMemoryAuthProvider que trae el SDK, con una diferencia
 * deliberada: ese demo aprueba a CUALQUIERA que llegue a /authorize, sin
 * pedir ninguna credencial ("simulate a user login"). Eso es aceptable para
 * un ejemplo local, pero inaceptable para un servidor expuesto a internet.
 * Aquí /authorize exige el passcode compartido del equipo antes de emitir el
 * código de autorización.
 *
 * Limitaciones conocidas (documentadas, no accidentales):
 * - Tokens y códigos en memoria: un reinicio del proceso cierra todas las
 *   sesiones activas. Aceptable para un equipo chico, no para un SaaS.
 * - Un solo passcode compartido por todo el equipo, no cuentas individuales.
 * - Sin rotación de refresh tokens (no se implementa exchangeRefreshToken:
 *   al expirar el access token, el cliente MCP repite el login).
 */

interface StoredCode {
  client: OAuthClientInformationFull;
  params: AuthorizationParams;
}

interface StoredToken {
  clientId: string;
  scopes: string[];
  expiresAt: number;
  resource?: URL;
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

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function renderLoginForm(opts: { action: string; error?: string }): string {
  const errorHtml = opts.error
    ? `<p style="color:#b00020;font-weight:600;margin:0 0 16px">${opts.error}</p>`
    : "";
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
  input { width: 100%; box-sizing: border-box; padding: 12px; border-radius: 8px; border: 1px solid #ccc; font-size: 1rem; margin-bottom: 16px; }
  button { width: 100%; padding: 12px; border-radius: 8px; border: none; background: #800040; color: #fff; font-weight: 700; font-size: 1rem; cursor: pointer; }
  button:hover { background: #6B003C; }
</style>
</head>
<body>
  <form method="POST" action="${opts.action}">
    <h1>Huellitas Solidarias</h1>
    <p class="sub">Ingresa el código de acceso del equipo para autorizar esta aplicación a consultar la API.</p>
    ${errorHtml}
    <input type="password" name="passcode" placeholder="Código de acceso" autofocus required />
    <button type="submit">Autorizar</button>
  </form>
</body>
</html>`;
}

export class PasscodeOAuthProvider implements OAuthServerProvider {
  readonly clientsStore = new InMemoryClientsStore();
  private codes = new Map<string, StoredCode>();
  private tokens = new Map<string, StoredToken>();

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

  /** Login pendiente de que el usuario mande el passcode (paso intermedio,
   * separado de `codes` porque todavía no hay código de autorización). */
  private pending = new Map<string, StoredCode>();

  /** Invocado por el handler HTTP propio en POST /authorize/submit. */
  handleLoginSubmit(pendingId: string, passcode: string, res: Response): void {
    const entry = this.pending.get(pendingId);
    if (!entry) {
      res.status(400).type("html").send(renderLoginForm({
        action: "/authorize",
        error: "La sesión de autorización expiró. Vuelve a intentarlo desde Claude.",
      }));
      return;
    }
    this.pending.delete(pendingId);

    if (!safeEqual(passcode, httpConfig.accessPasscode)) {
      res.status(401).type("html").send(renderLoginForm({
        action: `/authorize/submit?pending=${pendingId}`,
        error: "Código de acceso incorrecto.",
      }));
      // Se vuelve a guardar para permitir un reintento con el mismo pending id.
      this.pending.set(pendingId, entry);
      return;
    }

    const code = randomUUID();
    this.codes.set(code, entry);

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
    });

    return {
      access_token: token,
      token_type: "bearer",
      expires_in: expiresIn,
      scope: (codeData.params.scopes ?? []).join(" "),
    };
  }

  async exchangeRefreshToken(): Promise<OAuthTokens> {
    // Deliberadamente no soportado: al expirar el access token (1h), el
    // cliente MCP vuelve a pedir el passcode. Ver limitaciones en el comentario
    // de la clase.
    throw new Error("Refresh tokens no soportados: vuelve a autorizar la conexión.");
  }

  async verifyAccessToken(token: string): Promise<AuthInfo> {
    // Clientes que no hacen el login OAuth (mandan un bearer fijo desde su
    // propio entorno, p. ej. Codex): se valida contra MCP_STATIC_API_KEYS
    // antes de mirar la tabla de tokens emitidos por /token.
    for (const key of httpConfig.staticApiKeys) {
      if (safeEqual(token, key)) {
        return {
          token,
          clientId: "static-api-key",
          scopes: ["mcp:tools"],
          // Sin expiración real; se usa "ahora + 1 año" porque el tipo
          // AuthInfo exige un expiresAt numérico.
          expiresAt: Math.floor(Date.now() / 1000) + 365 * 24 * 3600,
        };
      }
    }

    const data = this.tokens.get(token);
    if (!data || data.expiresAt < Date.now()) {
      // Debe ser InvalidTokenError (no un Error generico): requireBearerAuth
      // del SDK solo mapea a 401 los errores de este tipo especifico, y cae
      // a 500 para cualquier otro (asi estaba antes de este fix).
      throw new InvalidTokenError("Invalid or expired token");
    }
    return {
      token,
      clientId: data.clientId,
      scopes: data.scopes,
      expiresAt: Math.floor(data.expiresAt / 1000),
      resource: data.resource,
    };
  }
}
