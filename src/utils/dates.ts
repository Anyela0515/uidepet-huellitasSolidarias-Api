/** Formatea fechas al estilo es-EC que espera el frontend. */

export function formatFechaLarga(date: Date = new Date()): string {
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatFechaCorta(date: Date = new Date()): string {
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatHora(date: Date = new Date()): string {
  return date.toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMiembroDesde(date: Date = new Date()): string {
  return date.toLocaleDateString("es-EC", {
    month: "long",
    year: "numeric",
  });
}

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
