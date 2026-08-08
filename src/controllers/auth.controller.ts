import { Request, Response } from "express";
import {
  changePasswordSchema,
  emailVerificationStatusQuerySchema,
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  sendEmailVerificationSchema,
  updateProfileSchema,
  verifyEmailQuerySchema,
} from "../schemas/auth.schema.js";
import {
  actualizarEstadoUsuarioSchema,
  actualizarRolSchema,
} from "../schemas/general.schema.js";
import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const login = asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const result = await authService.login(data);

  if ("error" in result) {
    const status = result.error === "suspendido" ? 403 : 401;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const register = asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await authService.register(data);

  if ("error" in result) {
    res.status(409).json({ error: result.error });
    return;
  }

  res.status(201).json(result);
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const data = changePasswordSchema.parse(req.body);
  const result = await authService.changePassword(
    req.user!.correo,
    data.currentPassword,
    data.newPassword
  );

  if ("error" in result) {
    const status = result.error.includes("incorrecta") ? 401 : 404;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
  const data = googleLoginSchema.parse(req.body);
  const result = await authService.loginWithGoogle(data);

  if ("error" in result) {
    const status = result.error === "suspendido" ? 403 : 401;
    res.status(status).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  const { correo } = forgotPasswordSchema.parse(req.body);
  const result = await authService.requestPasswordReset(correo);
  res.status(202).json({
    ...result,
    message: "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.",
  });
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  const { token, newPassword } = resetPasswordSchema.parse(req.body);
  const result = await authService.resetPasswordWithToken(token, newPassword);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.status(200).json(result);
});

export const sendEmailVerification = asyncHandler(async (req: Request, res: Response) => {
  const { correo, nombre } = sendEmailVerificationSchema.parse(req.body);
  const result = await authService.sendEmailVerification(correo, nombre);
  res.status(200).json(result);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = verifyEmailQuerySchema.parse(req.query);
  const result = await authService.verifyEmail(token);
  if ("error" in result) {
    res.status(400).json(result);
    return;
  }
  res.status(200).json(result);
});

export const emailVerificationStatus = asyncHandler(async (req: Request, res: Response) => {
  const { correo } = emailVerificationStatusQuerySchema.parse(req.query);
  const result = await authService.getEmailVerificationStatus(correo);
  res.status(200).json(result);
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const usuario = await authService.getMe(req.user!.sub);
  if (!usuario) {
    res.status(404).json({ error: "Usuario no encontrado." });
    return;
  }
  res.status(200).json({ usuario });
});

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const data = updateProfileSchema.parse(req.body);
  const result = await authService.updateProfile(req.user!.correo, data);

  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const { data, meta } = await authService.listUsers(
    req.query as Record<string, unknown>
  );
  res.status(200).json({ success: true, data, pagination: meta });
});

export const setRole = asyncHandler(async (req: Request, res: Response) => {
  const { rol } = actualizarRolSchema.parse(req.body);
  const correo = String(req.params.correo);
  const result = await authService.setRole(correo, rol, {
    id: req.user!.sub,
    correo: req.user!.correo,
  });

  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const setEstado = asyncHandler(async (req: Request, res: Response) => {
  const { estado } = actualizarEstadoUsuarioSchema.parse(req.body);
  const correo = String(req.params.correo);
  const result = await authService.setEstado(correo, estado, {
    id: req.user!.sub,
    correo: req.user!.correo,
  });

  if ("error" in result) {
    res.status(404).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  const correo = String(req.params.correo);
  const result = await authService.deleteUser(correo);

  if ("error" in result) {
    res.status(result.status ?? 500).json({ error: result.error });
    return;
  }

  res.status(200).json(result);
});
