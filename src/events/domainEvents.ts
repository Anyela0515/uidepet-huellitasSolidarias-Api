import { EventEmitter } from "node:events";

export interface DomainEventPayload {
  usuarioId: number | null;
  usuarioCorreo: string | null;
  entidad: string;
  entidadId: string;
  detalle?: unknown;
}

/** Bus de eventos de dominio del backend: los servicios publican un evento
 * tras completar una acción sensible, y los listeners (auditoria, y en el
 * futuro otros como notificaciones) lo consumen por separado, sin bloquear
 * la respuesta HTTP que originó la acción. */
export const domainEvents = new EventEmitter();

/**
 * Publica un evento de dominio de forma asíncrona: se emite en el siguiente
 * tick del event loop, no en la misma llamada, para que el request que lo
 * origina nunca espere a los listeners. Un listener que falla se atrapa en
 * el propio listener (ver auditListener.ts) y no debe poder tumbar nada.
 */
export function publish(accion: string, payload: DomainEventPayload): void {
  setImmediate(() => {
    domainEvents.emit(accion, payload);
  });
}
