import { Router } from "express";
import * as controller from "../controllers/denuncia.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.post("/", controller.crear);

router.use(requireJwt);

router.get("/", requireRole("admin"), controller.listar);
router.patch("/:id/estado", requireRole("admin"), controller.actualizarEstado);

export default router;
