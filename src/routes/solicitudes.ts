import { Router } from "express";
import * as controller from "../controllers/solicitud.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(requireJwt);

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.post("/", requireRole("usuario"), controller.crear);

router.patch(
  "/:id/estado",
  requireRole("fundacion", "admin"),
  controller.actualizarEstado
);

router.post("/:id/seguimiento", requireRole("usuario"), controller.agregarSeguimiento);

export default router;
