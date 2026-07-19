import { Router } from "express";
import * as controller from "../controllers/favorito.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";

const router = Router();

router.use(requireJwt, requireRole("usuario"));

router.get("/", controller.listar);
// Alias explícito pedido por el contrato de la API; se mantiene también
// "/:mascotaId" (sin sufijo) por compatibilidad con el frontend existente.
router.get("/:mascotaId/verificar", controller.verificar);
router.get("/:mascotaId", controller.verificar);
router.post("/:mascotaId/toggle", controller.toggle);
router.post("/:mascotaId", controller.agregar);
router.delete("/:mascotaId", controller.eliminar);

export default router;
