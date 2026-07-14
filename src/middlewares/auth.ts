import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export type RolUsuario = "usuario" | "fundacion" | "admin";

export interface AppJwtPayload {
  sub: number;
  correo: string;
  rol: RolUsuario;
}

declare global {
  namespace Express {
    interface Request {
      user?: AppJwtPayload;
    }
  }
}

export function requireJwt(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header) {
    res.status(401).json({ error: "Token ausente" });
    return;
  }

  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token malformado" });
    return;
  }

  try {
    const token = header.split(" ")[1];
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string
    ) as unknown as AppJwtPayload;

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
  }
}

export function requireRole(...rolesPermitidos: RolUsuario[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Usuario no autenticado" });
      return;
    }

    if (!rolesPermitidos.includes(req.user.rol)) {
      res.status(403).json({
        error: "Acceso denegado. Rol insuficiente.",
      });
      return;
    }

    next();
  };
}
