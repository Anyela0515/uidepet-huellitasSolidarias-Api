import { domainEvents, type DomainEventPayload } from "./domainEvents.js";
import * as auditoriaRepo from "../repositories/auditoria.repository.js";

/** Acciones sensibles que dejan rastro en la tabla `auditoria` (inmutable,
 * ver db/migrations/2026_08_05_auditoria_inmutable.sql). Cada una se publica
 * desde el service correspondiente, después de que la escritura de negocio
 * ya se confirmó. */
const ACCIONES_AUDITADAS = [
  "solicitud.aprobada",
  "solicitud.rechazada",
  "solicitud.seguimiento",
  "usuario.rol_cambiado",
  "usuario.estado_cambiado",
  "reporte.estado_cambiado",
  "donacion.estado_cambiado",
] as const;

/** Se llama una sola vez al arrancar el servidor (ver src/index.ts). Consume
 * los eventos de forma asíncrona y desacoplada del request original: si
 * escribir el log falla, se registra el error pero no afecta nada más. */
export function registrarAuditListener(): void {
  for (const accion of ACCIONES_AUDITADAS) {
    domainEvents.on(accion, (payload: DomainEventPayload) => {
      auditoriaRepo
        .insertar({
          usuarioId: payload.usuarioId,
          usuarioCorreo: payload.usuarioCorreo,
          accion,
          entidad: payload.entidad,
          entidadId: payload.entidadId,
          detalle: payload.detalle,
        })
        .catch((error) => {
          console.error(`No se pudo escribir el log de auditoría para "${accion}":`, error);
        });
    });
  }
}
