import "dotenv/config";
import jwt from "jsonwebtoken";

/**
 * Utilidad de desarrollo: genera un JWT válido para probar rutas protegidas
 * sin pasar por /auth/login. El payload coincide con AppJwtPayload real
 * (src/middlewares/auth.ts): { sub, correo, rol }.
 *
 * Uso: node generate-token.mjs [correo] [rol]
 * Ejemplo: node generate-token.mjs admin@huellitas.com admin
 */

const secret = process.env.JWT_SECRET;
if (!secret || secret.length < 32) {
  console.error("Falta JWT_SECRET (mínimo 32 caracteres) en tu .env");
  process.exit(1);
}

const correo = process.argv[2] ?? "admin@huellitas.com";
const rol = process.argv[3] ?? "admin";

const token = jwt.sign({ sub: 1, correo, rol }, secret, {
  expiresIn: process.env.JWT_EXPIRES_IN || "8h",
});

console.log(token);
