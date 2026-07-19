import { Router } from "express";
import * as controller from "../controllers/solicitud.controller.js";
import { requireJwt } from "../middlewares/auth.js";

const router = Router();

router.use(requireJwt);

router.patch("/:id", controller.actualizarSeguimiento);
router.delete("/:id", controller.eliminarSeguimiento);
router.post("/:id/archivos", controller.agregarArchivoSeguimiento);
router.delete("/:id/archivos/:archivoId", controller.eliminarArchivoSeguimiento);

export default router;
