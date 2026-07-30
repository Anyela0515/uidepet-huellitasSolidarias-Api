import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    // mcp-server/ es un paquete npm aparte, con su propio tsconfig y sus
    // propias dependencias; se valida con sus propios scripts, no con el lint
    // del backend (que ni conoce sus globals de Node ni su configuración).
    ignores: ["dist/**", "node_modules/**", "coverage/**", "mcp-server/**"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" }
      ]
    }
  },
  {
    files: ["**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        fetch: "readonly",
        performance: "readonly",
        URL: "readonly",
        setTimeout: "readonly"
      }
    }
  }
);
