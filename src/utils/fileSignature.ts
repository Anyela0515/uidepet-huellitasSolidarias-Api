import sharp from "sharp";
import { ValidationAppError } from "./errors.js";

export const EVIDENCE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "video/mp4"] as const;
export type EvidenceMimeType = (typeof EVIDENCE_MIME_TYPES)[number];

const IMAGE_FORMAT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * El cliente declara el MIME (en el nombre del campo y en el prefijo del
 * data URL), pero ambos son texto que el propio cliente controla. Aquí se
 * decodifica el base64 y se inspecciona el archivo real: para imágenes se
 * usa sharp (que detecta el formato leyendo la cabecera real del archivo,
 * no la extensión), para video/mp4 se verifica la caja "ftyp" que todo MP4
 * válido trae en sus primeros bytes.
 */
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

/**
 * Decodifica un data URL ("data:<mime>;base64,<payload>") y confirma que su
 * contenido real coincide con el mime declarado. Lanza ValidationAppError
 * (422) con el nombre del archivo si no coincide o si el data URL está mal
 * formado, para que el cliente reciba un mensaje claro en vez de un 500.
 */
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
