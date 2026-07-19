import { Router } from "express";
import * as controller from "../controllers/fundacion.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.post("/", controller.registrar);

router.use(requireJwt);

router.get("/", requireRole("admin"), controller.listar);
router.get("/me", requireRole("fundacion"), controller.me);
router.patch("/me", requireRole("fundacion"), controller.actualizarMe);
router.get("/:id", requireRole("admin"), controller.obtener);
router.patch("/:id/estado", requireRole("admin"), controller.actualizarEstado);
router.delete("/:id", requireRole("admin"), controller.eliminar);

export default router;
