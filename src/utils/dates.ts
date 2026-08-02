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

/** Para columnas DATE (sin hora): la conexión usa timezone "Z", así que
 * mysql2 devuelve estas fechas como medianoche UTC. Hay que leerlas con
 * los getters UTC*, no los locales, o el día se corre en zonas con offset
 * negativo (America/Guayaquil, UTC-5) al aplicar la zona del proceso. */
export function fechaToISO(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatFechaCortaUTC(date: Date): string {
  return date.toLocaleDateString("es-EC", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "Hoy" en la fecha calendario de Ecuador (UTC-5, sin horario de verano),
 * no la del servidor (los contenedores corren en UTC). Sirve para validar
 * fechas de negocio como "no agendar una entrega en el pasado": si se
 * comparara contra la fecha UTC del servidor, entre las 19:00 y 23:59 hora
 * de Ecuador el servidor ya estaria un dia adelante y rechazaria "hoy". */
export function hoyEcuadorISO(): string {
  const ahoraEcuador = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const y = ahoraEcuador.getUTCFullYear();
  const m = String(ahoraEcuador.getUTCMonth() + 1).padStart(2, "0");
  const d = String(ahoraEcuador.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
