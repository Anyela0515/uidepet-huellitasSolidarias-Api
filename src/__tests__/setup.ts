import "dotenv/config";
import { vi } from "vitest";

process.env.JWT_SECRET ??= "vitest_only_secret_not_for_production_32_chars";
process.env.JWT_EXPIRES_IN ??= "1h";

vi.mock("../services/email.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/email.service.js")>();
  return Object.fromEntries(
    Object.entries(actual).map(([nombre, valor]) =>
      nombre.startsWith("send") && typeof valor === "function"
        ? [nombre, vi.fn().mockResolvedValue(undefined)]
        : [nombre, valor]
    )
  );
});
