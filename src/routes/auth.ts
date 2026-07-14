import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { requireJwt, requireRole } from "../middlewares/auth.js";
import { authRateLimiter } from "../middlewares/rateLimiter.js";

const router = Router();

router.post("/login", authRateLimiter, authController.login);
router.post("/register", authRateLimiter, authController.register);
router.post("/reset-password", authRateLimiter, authController.resetPassword);

router.get("/me", requireJwt, authController.me);
router.patch("/perfil", requireJwt, authController.updateProfile);

router.get(
  "/usuarios",
  requireJwt,
  requireRole("admin"),
  authController.listUsers
);

router.patch(
  "/usuarios/:correo/rol",
  requireJwt,
  requireRole("admin"),
  authController.setRole
);

router.patch(
  "/usuarios/:correo/estado",
  requireJwt,
  requireRole("admin"),
  authController.setEstado
);

export default router;
