import { Router, type Request, type Response } from "express";

const router = Router();

const CANALES_SEGUIMIENTO = ["whatsapp", "correo", "telefono"] as const;

router.post("/", (req: Request, res: Response) => {
  const {
    id_mascota,
    id_usuario,
    tipo_vivienda,
    tiene_mascotas,
    motivo_adopcion,
    acepta_seguimiento,
    canal_seguimiento,
  } = req.body;

  if (
    !id_mascota ||
    !id_usuario ||
    !tipo_vivienda ||
    typeof tiene_mascotas !== "boolean" ||
    !motivo_adopcion ||
    typeof acepta_seguimiento !== "boolean" ||
    !canal_seguimiento
  ) {
    return res.status(400).json({
      error:
        "Campos requeridos: id_mascota, id_usuario, tipo_vivienda, tiene_mascotas, motivo_adopcion, acepta_seguimiento, canal_seguimiento",
    });
  }

  if (!CANALES_SEGUIMIENTO.includes(canal_seguimiento)) {
    return res.status(400).json({
      error: "canal_seguimiento invalido. Valores: whatsapp, correo, telefono",
    });
  }

  return res.status(201).json({
    version: "v2",
    message: "Solicitud de adopcion registrada correctamente con seguimiento",
    data: {
      id_solicitud: 1,
      id_mascota,
      id_usuario,
      tipo_vivienda,
      tiene_mascotas,
      motivo_adopcion,
      acepta_seguimiento,
      canal_seguimiento,
      estado: "EN_REVISION",
      fecha_solicitud: new Date().toISOString(),
    },
  });
});

export default router;