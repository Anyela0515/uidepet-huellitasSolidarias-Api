/**
 * edadGrupo se deriva (no se persiste) — evita dependencia transitiva 3FN.
 * Regla alineada al catálogo del frontend (Joven / Adulto).
 */
export function computeEdadGrupo(valor: number, unidad: string): string {
  if (unidad === "Meses") {
    return valor <= 24 ? "Joven" : "Adulto";
  }
  return valor <= 2 ? "Joven" : "Adulto";
}

export function formatEdad(valor: number, unidad: string): string {
  return `${valor} ${unidad}`;
}

export function parseEdadTexto(edad: string): { valor: number; unidad: string } {
  const match = String(edad ?? "")
    .trim()
    .match(/^(\d+)\s*(Años|Meses|años|meses)?$/i);

  if (!match) {
    return { valor: 1, unidad: "Años" };
  }

  const valor = Number(match[1]);
  const raw = (match[2] ?? "Años").toLowerCase();
  const unidad = raw.startsWith("mes") ? "Meses" : "Años";
  return { valor, unidad };
}
