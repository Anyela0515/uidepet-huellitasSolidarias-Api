import sharp from "sharp";
import { ValidationAppError } from "./errors.js";

export const EVIDENCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"] as const;
export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

const IMAGE_FORMAT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function firmaCoincideConMime(buffer: Buffer, mimeDeclarado: string): Promise<boolean> {
  if (mimeDeclarado === "application/pdf") {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
  }

  if (mimeDeclarado === "video/mp4") {
    return buffer.length > 8 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }

  const formatoEsperado = IMAGE_FORMAT_BY_MIME[mimeDeclarado];
  if (!formatoEsperado) return false;

  try {
    const metadata = await sharp(buffer).metadata();
    return metadata.format === formatoEsperado;
  } catch {
    return false;
  }
}

export async function verificarEvidenciaOLanzar(
  contenido: string,
  mimeDeclarado: string,
  nombreArchivo: string
): Promise<void> {
  const match = contenido.match(/^data:([a-zA-Z0-9./+-]+);base64,(.+)$/);
  if (!match || match[1] !== mimeDeclarado) {
    throw new ValidationAppError(`${nombreArchivo}: el archivo está corrupto o no es válido.`);
  }

  const buffer = Buffer.from(match[2], "base64");
  const coincide = await firmaCoincideConMime(buffer, mimeDeclarado);
  if (!coincide) {
    throw new ValidationAppError(
      `${nombreArchivo}: el contenido del archivo no coincide con el tipo declarado (${mimeDeclarado}).`
    );
  }
}
