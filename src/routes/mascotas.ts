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

export default router;
