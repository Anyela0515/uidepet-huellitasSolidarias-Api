import { EventEmitter } from "node:events";

export interface DomainEventPayload {
  usuarioId: number | null;
  usuarioCorreo: string | null;
  entidad: string;
  entidadId: string;
  detalle?: unknown;
}

export const domainEvents = new EventEmitter();

export function publish(accion: string, payload: DomainEventPayload): void {
  setImmediate(() => {
    domainEvents.emit(accion, payload);
  });
}
