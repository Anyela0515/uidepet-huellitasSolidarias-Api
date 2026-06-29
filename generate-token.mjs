import { createHmac, randomUUID } from "crypto";

const secret = process.env.JWT_SECRET ?? "secreto-demo-huellitas";

function base64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

const header = base64url(
  JSON.stringify({
    alg: "HS256",
    typ: "JWT",
  })
);

const payload = base64url(
  JSON.stringify({
    sub: "20251042",
    iss: "https://auth.uide.edu.ec",
    aud: "https://api.uide.edu.ec/uidepet",
    scope: "uidepet:write",
    exp: Math.floor(Date.now() / 1000) + 3600,
    jti: randomUUID(),
  })
);

const signature = createHmac("sha256", secret)
  .update(`${header}.${payload}`)
  .digest("base64url");

console.log(`${header}.${payload}.${signature}`);