import { describe, expect, it } from "vitest";
import { seguimientoSolicitudSchema } from "./solicitud.schema.js";

const foto = {
  nombreArchivo: "bienestar.jpg",
  mimeType: "image/jpeg" as const,
  tamanioBytes: 1,
  contenido: "data:image/jpeg;base64,YQ==",
};

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
