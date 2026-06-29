import { type Request, type Response, type NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";

const JWT_SECRET = process.env.JWT_SECRET ?? "secreto-demo-huellitas";

function base64urlDecode(value: string): string {
  return Buffer.from(
    value.replace(/-/g, "+").replace(/_/g, "/"),
    "base64"
  ).toString("utf8");
}

export function requireJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : "";

  if (!token) {
    return res.status(401).json({ error: "Token ausente" });
  }

  const parts = token.split(".");

  if (parts.length !== 3) {
    return res.status(401).json({ error: "Token malformado" });
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    const header = JSON.parse(base64urlDecode(headerB64));

    if (header.alg !== "HS256") {
      return res.status(401).json({ error: "Algoritmo no permitido" });
    }

    const expectedSignature = createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    const receivedBuffer = Buffer.from(signatureB64);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      return res.status(401).json({ error: "Firma invalida" });
    }

    const claims = JSON.parse(base64urlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (claims.exp && claims.exp < now) {
      return res.status(401).json({ error: "Token expirado" });
    }

    if (!claims.sub) {
      return res.status(401).json({ error: "Claim sub ausente" });
    }

    (req as Request & { user?: unknown }).user = {
      sub: claims.sub,
      scope: claims.scope ?? "",
    };

    next();
  } catch {
    return res.status(401).json({ error: "Token invalido" });
  }
}