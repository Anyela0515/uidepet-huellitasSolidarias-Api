import { Router } from "express";
import * as controller from "../controllers/configuracionSitio.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.get("/", controller.obtener);
router.patch("/", requireJwt, requireRole("admin"), controller.actualizar);

export default router;
