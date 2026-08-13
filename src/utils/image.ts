import sharp from "sharp";

const MAX_DIMENSION = 800;
const JPEG_QUALITY = 75;

export async function compressImageDataUrl(dataUrl: string): Promise<string> {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return dataUrl;

  const buffer = Buffer.from(match[2], "base64");
  try {
    const comprimido = await sharp(buffer)
      .rotate()
      .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();

    return `data:image/jpeg;base64,${comprimido.toString("base64")}`;
  } catch (error) {
    console.error("No se pudo comprimir la imagen, se guarda sin comprimir:", error);
    return dataUrl;
  }
}
