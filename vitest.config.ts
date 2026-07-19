import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    testTimeout: 15000,
    hookTimeout: 15000,
    setupFiles: ["./src/__tests__/setup.ts"],
    // Los tests de integración comparten una única base de datos real de
    // desarrollo (no hay BD de pruebas aislada por worker). Ejecutar los
    // archivos en paralelo produce carreras (p. ej. un archivo crea/borra
    // mascotas mientras otro lee el listado público ordenado por fecha).
    fileParallelism: false,
  },
});
