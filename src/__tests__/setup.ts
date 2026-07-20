import "dotenv/config";

// Las pruebas necesitan firmar tokens, pero no deben depender de una clave real
// ni guardar secretos locales en el repositorio. Una variable definida por el
// entorno (por ejemplo, en CI) siempre tiene prioridad.
process.env.JWT_SECRET ??= "vitest_only_secret_not_for_production_32_chars";
process.env.JWT_EXPIRES_IN ??= "1h";
