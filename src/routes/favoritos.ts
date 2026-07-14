import { Router } from "express";
import * as controller from "../controllers/favorito.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(requireJwt, requireRole("usuario"));

router.get("/", controller.listar);
router.get("/:mascotaId", controller.verificar);
router.post("/:mascotaId/toggle", controller.toggle);

export default router;
