import { Router, type Request, type Response } from "express";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const {
    id_mascota,
    id_usuario,
    tipo_vivienda,
    tiene_mascotas,
    motivo_adopcion,
  } = req.body;

  if (
    !id_mascota ||
    !id_usuario ||
    !tipo_vivienda ||
    typeof tiene_mascotas !== "boolean" ||
    !motivo_adopcion
  ) {
    return res.status(400).json({
      error:
        "Campos requeridos: id_mascota, id_usuario, tipo_vivienda, tiene_mascotas, motivo_adopcion",
    });
  }

  return res.status(201).json({
    version: "v1",
    message: "Solicitud de adopcion registrada correctamente",
    data: {
      id_solicitud: 1,
      id_mascota,
      id_usuario,
      tipo_vivienda,
      tiene_mascotas,
      motivo_adopcion,
      estado: "EN_REVISION",
      fecha_solicitud: new Date().toISOString(),
    },
  });
});

export default router;