import { Router } from "express";
import * as controller from "../controllers/donacion.controller.js";
import { requireJwt } from "../middlewares/auth.js";

const router = Router();

router.post("/", controller.crear);

router.use(requireJwt);

router.get("/", controller.listar);

export default router;
