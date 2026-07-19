import { Router } from "express";
import * as controller from "../controllers/mensaje.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.post("/", controller.crear);

router.use(requireJwt);

router.get("/", requireRole("fundacion", "admin"), controller.listar);
router.patch(
  "/:id/leido",
  requireRole("fundacion", "admin"),
  controller.marcarLeido
);

export default router;
