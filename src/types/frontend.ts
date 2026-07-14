export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  cedula: string;
  telefono: string;
  direccion: string;
  rol: "usuario" | "fundacion" | "admin";
  estado: string;
  organizacion?: string;
  miembroDesde?: string;
}

export interface Mascota {
  id: number;
  nombre: string;
  especie: string;
  raza: string;
  edad: string;
  edadGrupo: string;
  sexo: string;
  tamano: string;
  ubicacion: string;
  historia: string;
  requisitos: string;
  tags: string[];
  imagen: string;
  fundacion: string;
  fundacionEmail: string;
  estado: string;
  fechaPublicacion: string;
  hidden: boolean;
}

export interface Solicitud {
  id: string;
  petId: number;
  mascota: string;
  raza: string;
  edad: string;
  ubicacion: string;
  codigo: string;
  fecha: string;
  fechaCorta: string;
  hora: string;
  estado: string;
  adoptante: string;
  adoptanteEmail: string;
  fundacion: string;
  fundacionEmail: string;
  observaciones: string;
  proximoPaso: string;
  imagen: string;
  tags: string[];
  formData: Record<string, unknown>;
  seguimientoEnviado: boolean;
  seguimientoComentario?: string;
  seguimientoArchivos?: number;
  seguimientoArchivosNombres: string[];
  seguimientoFecha?: string;
}

export interface FundacionPendiente {
  id: string;
  nombre: string;
  organizacion: string;
  ruc: string;
  representante: string;
  correo: string;
  telefono: string;
  ciudad: string;
  descripcion: string;
  documento: string;
  estado: string;
  fecha: string;
}
