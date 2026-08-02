import { Router } from "express";
import * as controller from "../controllers/mascota.controller.js";
import { optionalJwt, requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/publicas", controller.listarPublicas);
router.get("/:id", optionalJwt, controller.obtener);

router.use(requireJwt);

router.get("/", controller.listar);

router.post(
  "/verificar-imagen",
  requireRole("fundacion"),
  controller.verificarImagen
);

router.post(
  "/",
  requireRole("fundacion", "admin"),
  controller.crear
);

router.patch(
  "/:id",
  requireRole("fundacion", "admin"),
  controller.actualizar
);

router.delete(
  "/:id",
  requireRole("fundacion", "admin"),
  controller.eliminar
);

router.post(
  "/:id/tags",
  requireRole("fundacion", "admin"),
  controller.agregarTag
);
router.delete(
  "/:id/tags/:tagId",
  requireRole("fundacion", "admin"),
  controller.quitarTag
);

export default router;
