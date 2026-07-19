import { Router } from "express";
import * as controller from "../controllers/mascota.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/publicas", controller.listarPublicas);
router.get("/:id", controller.obtener);

router.use(requireJwt);

router.get("/", controller.listar);

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

router.post(
  "/:id/medios",
  requireRole("fundacion", "admin"),
  controller.agregarMedio
);
router.delete(
  "/:id/medios/:medioId",
  requireRole("fundacion", "admin"),
  controller.quitarMedio
);

export default router;
