import { describe, it, expect } from "vitest";
import { computeEdadGrupo, formatEdad, parseEdadTexto } from "./edad.js";

describe("parseEdadTexto", () => {
  it("parsea años", () => {
    expect(parseEdadTexto("3 Años")).toEqual({ valor: 3, unidad: "Años" });
  });

  it("parsea meses (case-insensitive)", () => {
    expect(parseEdadTexto("8 meses")).toEqual({ valor: 8, unidad: "Meses" });
  });

  it("usa el default seguro si el texto no matchea el patrón esperado", () => {
    expect(parseEdadTexto("adulto")).toEqual({ valor: 1, unidad: "Años" });
  });
});

describe("computeEdadGrupo", () => {
  it("clasifica como Joven hasta 2 años inclusive", () => {
    expect(computeEdadGrupo(2, "Años")).toBe("Joven");
    expect(computeEdadGrupo(3, "Años")).toBe("Adulto");
  });

  it("clasifica como Joven hasta 24 meses inclusive", () => {
    expect(computeEdadGrupo(24, "Meses")).toBe("Joven");
    expect(computeEdadGrupo(25, "Meses")).toBe("Adulto");
  });
});

describe("formatEdad", () => {
  it("concatena valor y unidad", () => {
    expect(formatEdad(2, "Años")).toBe("2 Años");
  });
});
