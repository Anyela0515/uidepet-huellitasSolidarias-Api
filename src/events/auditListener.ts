import { domainEvents, type DomainEventPayload } from "./domainEvents.js";
import * as auditoriaRepo from "../repositories/auditoria.repository.js";

const ACCIONES_AUDITADAS = [
  "solicitud.aprobada",
  "solicitud.rechazada",
  "solicitud.seguimiento",
  "usuario.rol_cambiado",
  "usuario.estado_cambiado",
  "reporte.estado_cambiado",
  "donacion.estado_cambiado",
] as const;

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
