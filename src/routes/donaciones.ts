import { Router } from "express";
import * as controller from "../controllers/donacion.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";
import { publicFormRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/", publicFormRateLimiter, controller.crear);

router.use(requireJwt);

router.get("/", controller.listar);
router.get("/:id", controller.obtener);
router.patch("/:id/estado", requireRole("admin"), controller.actualizarEstado);
router.delete("/:id", requireRole("admin"), controller.eliminar);

export default router;
