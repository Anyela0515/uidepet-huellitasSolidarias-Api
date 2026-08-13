import "dotenv/config";

process.env.JWT_SECRET ??= "vitest_only_secret_not_for_production_32_chars";
process.env.JWT_EXPIRES_IN ??= "1h";
