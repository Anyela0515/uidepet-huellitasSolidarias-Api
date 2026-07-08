import { Router } from "express";
import { requireRole } from "../../middlewares/auth.js";
import * as controller from "../../controllers/mascota.controller.js";

const router = Router();

router.get("/", controller.listar);
router.get("/:id", controller.obtener);

router.post(
  "/",
  requireRole("organizacion", "admin"),
  controller.crear
);

router.patch(
  "/:id",
  requireRole("organizacion", "admin"),
  controller.actualizar
);

router.delete(
  "/:id",
  requireRole("organizacion", "admin"),
  controller.eliminar
);

export default router;