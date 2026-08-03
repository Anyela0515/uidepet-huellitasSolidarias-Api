import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import * as usuarioRepo from "../repositories/usuario.repository.js";

export const JWT_ISSUER = "huellitas-solidarias-api";
export const JWT_AUDIENCE = "huellitas-solidarias-app";

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

export async function requireJwt(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header) {
    res.status(401).json({ error: "Token ausente" });
    return;
  }

  if (!header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token malformado" });
    return;
  }

  let payload: AppJwtPayload;
  try {
    const token = header.split(" ")[1];
    payload = jwt.verify(token, process.env.JWT_SECRET as string, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as unknown as AppJwtPayload;
  } catch {
    res.status(401).json({ error: "Token inválido o expirado" });
    return;
  }

  // El JWT por sí solo no refleja cambios posteriores a su emisión (cuenta
  // suspendida/eliminada, rol cambiado): se revalida contra la base en cada
  // request, y se usa el rol ACTUAL de la base, no el que traía el token.
  try {
    const actual = await usuarioRepo.findEstadoActual(payload.sub);
    if (!actual || actual.estado_codigo !== "Activo") {
      res.status(401).json({ error: "Token inválido o expirado" });
      return;
    }
    req.user = { sub: payload.sub, correo: actual.correo, rol: actual.rol_codigo as RolUsuario };
    next();
  } catch (error) {
    next(error);
  }
}

/** Igual que requireJwt, pero nunca bloquea: si no hay token (o es inválido), sigue como anónimo. */
export function optionalJwt(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const token = header.split(" ")[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET as string, {
        algorithms: ["HS256"],
        issuer: JWT_ISSUER,
        audience: JWT_AUDIENCE,
      }) as unknown as AppJwtPayload;
    } catch {
      // Token ausente/inválido: se continúa sin req.user, como visitante anónimo.
    }
  }
  next();
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
