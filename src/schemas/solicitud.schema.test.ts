import { describe, expect, it } from "vitest";
import {
  formularioAdopcionSchema,
  seguimientoSolicitudSchema,
} from "./solicitud.schema.js";

const foto = {
  nombreArchivo: "bienestar.jpg",
  mimeType: "image/jpeg" as const,
  tamanioBytes: 1,
  contenido: "data:image/jpeg;base64,YQ==",
};

const fotoHogar = {
  name: "sala.jpg",
  type: "image/jpeg" as const,
  size: 1200,
  url: "data:image/jpeg;base64,YQ==",
};

const contratoPdf = {
  name: "Contrato firmado - carta.pdf",
  type: "application/pdf" as const,
  size: 2200,
  url: "data:application/pdf;base64,JVBERi0=",
};

describe("formularioAdopcionSchema", () => {
  const baseForm = {
    nombre: "Ana Pérez López",
    cedula: "1710034065",
    telefono: "0991234567",
    correo: "ana@example.com",
    direccion: "Av. Principal 123 y Secundaria",
    localidadId: "101",
    tipoVivienda: "Casa propia",
    personasHogar: "3",
    acuerdoHogar: "si",
    permanenciaAnimal: "En el patio techado",
    lugarDormir: "Cama propia en la sala",
    tieneMascotas: "no",
    responsableCuidado: "Ana Pérez López",
    responsableGastos: "Ana Pérez López",
    seguimiento: "si",
    contrato: "si",
    declaracion: true as const,
  };

  it("acepta solo fotos del hogar en el alta (sin PDF)", () => {
    const result = formularioAdopcionSchema.safeParse({
      ...baseForm,
      evidencias: [
        fotoHogar,
        { ...fotoHogar, name: "patio.jpg" },
        { ...fotoHogar, name: "cerco.png", type: "image/png", url: "data:image/png;base64,YQ==" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un PDF dentro del alta de la solicitud", () => {
    const result = formularioAdopcionSchema.safeParse({
      ...baseForm,
      evidencias: [fotoHogar, contratoPdf],
    });
    expect(result.success).toBe(false);
  });
});

describe("evidenciaAdopcionSchema", () => {
  it("acepta el PDF del contrato firmado en el endpoint aparte", async () => {
    const { evidenciaAdopcionSchema } = await import("./solicitud.schema.js");
    const result = evidenciaAdopcionSchema.safeParse({
      nombreArchivo: contratoPdf.name,
      mimeType: contratoPdf.type,
      tamanioBytes: contratoPdf.size,
      contenido: contratoPdf.url,
    });
    expect(result.success).toBe(true);
  });
});

describe("seguimientoSolicitudSchema", () => {
  it("acepta un reporte mensual con evidencia", () => {
    const result = seguimientoSolicitudSchema.safeParse({
      comentario: "La mascota está activa, alimentada y en buen estado.",
      archivos: [foto],
    });

    expect(result.success).toBe(true);
  });

  it("requiere al menos un archivo", () => {
    const result = seguimientoSolicitudSchema.safeParse({
      comentario: "La mascota está activa, alimentada y en buen estado.",
      archivos: [],
    });

    expect(result.success).toBe(false);
  });

  it("rechaza más de un video por reporte", () => {
    const video = {
      nombreArchivo: "avance.mp4",
      mimeType: "video/mp4" as const,
      tamanioBytes: 1,
      contenido: "data:video/mp4;base64,YQ==",
    };
    const result = seguimientoSolicitudSchema.safeParse({
      comentario: "La mascota está activa, alimentada y en buen estado.",
      archivos: [video, { ...video, nombreArchivo: "avance-2.mp4" }],
    });

    expect(result.success).toBe(false);
  });
});
