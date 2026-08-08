import { Router } from "express";
import * as controller from "../controllers/denuncia.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";
import { publicFormRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/", publicFormRateLimiter, controller.crear);
router.get("/:codigo", publicFormRateLimiter, controller.consultar);

router.use(requireJwt);

router.get("/", requireRole("admin", "fundacion"), controller.listar);
router.patch("/:id/estado", requireRole("admin", "fundacion"), controller.actualizarEstado);

export default router;
