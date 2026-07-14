import { Router } from "express";
import * as controller from "../controllers/mensaje.controller.js";
import { requireJwt } from "../middlewares/auth.js";

const router = Router();

router.post("/", controller.crear);

router.use(requireJwt);

router.get("/", controller.listar);
router.patch("/:id/leido", controller.marcarLeido);

export default router;
