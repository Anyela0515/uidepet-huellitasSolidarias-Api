import { describe, it, expect } from "vitest";
import { buildPaginationMeta, buildSortClause, parsePagination } from "./pagination.js";

describe("parsePagination", () => {
  it("aplica valores por defecto cuando no llega query", () => {
    expect(parsePagination({})).toEqual({ page: 1, limit: 10, offset: 0 });
  });

  it("normaliza page y limit y calcula el offset", () => {
    expect(parsePagination({ page: "3", limit: "20" })).toEqual({
      page: 3,
      limit: 20,
      offset: 40,
    });
  });

  it("limita el máximo de limit a 100", () => {
    expect(parsePagination({ limit: "500" }).limit).toBe(100);
  });

  it("nunca permite un limit menor a 1", () => {
    expect(parsePagination({ limit: "0" }).limit).toBe(10);
    expect(parsePagination({ limit: "-5" }).limit).toBe(10);
  });

  it("ignora un page inválido y usa el default", () => {
    expect(parsePagination({ page: "-5" }).page).toBe(1);
    expect(parsePagination({ page: "abc" }).page).toBe(1);
  });
});

describe("buildPaginationMeta", () => {
  it("calcula totalPages y los flags de navegación", () => {
    expect(buildPaginationMeta(2, 10, 25)).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true,
    });
  });

  it("no hay siguiente ni anterior cuando todo cabe en una página", () => {
    const meta = buildPaginationMeta(1, 10, 5);
    expect(meta.hasNextPage).toBe(false);
    expect(meta.hasPreviousPage).toBe(false);
  });
});

describe("buildSortClause", () => {
  const allowed = { nombre: "m.nombre", fecha: "m.publicada_en" };

  it("usa el campo por defecto si sortBy no está en la lista blanca", () => {
    expect(buildSortClause("inventado", undefined, allowed, "fecha")).toBe(
      "m.publicada_en DESC"
    );
  });

  it("acepta un campo válido de la lista blanca y respeta sortOrder", () => {
    expect(buildSortClause("nombre", "asc", allowed, "fecha")).toBe("m.nombre ASC");
  });

  it("nunca interpola directamente un input malicioso del usuario", () => {
    const malicious = "m.nombre; DROP TABLE mascotas;--";
    const result = buildSortClause(malicious, "asc", allowed, "fecha");
    expect(result).not.toContain("DROP TABLE");
    expect(result).toBe("m.publicada_en ASC");
  });
});
