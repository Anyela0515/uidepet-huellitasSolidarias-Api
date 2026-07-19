import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/errors.js";

interface MysqlLikeError extends Error {
  code?: string;
  sqlMessage?: string;
}

function isMysqlError(err: unknown): err is MysqlLikeError {
  return (
    err instanceof Error &&
    typeof (err as MysqlLikeError).code === "string" &&
    (err as MysqlLikeError).code!.startsWith("ER_")
  );
}

/**
 * Mantiene el shape histórico {code, error} que el frontend ya consume,
 * y añade {success, message, errorCode} para alinearse con el contrato del prompt.
 */
function send(
  res: Response,
  status: number,
  message: string,
  errorCode: string,
  details?: unknown
) {
  res.status(status).json({
    success: false,
    code: status,
    error: message,
    message,
    errorCode,
    ...(details !== undefined ? { details } : {}),
  });
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    send(res, err.statusCode, err.message, err.code, err.details);
    return;
  }

  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    }));
    send(res, 422, "Datos de entrada inválidos.", "VALIDATION_ERROR", details);
    return;
  }

  if (
    err instanceof jwt.JsonWebTokenError ||
    err instanceof jwt.TokenExpiredError
  ) {
    send(res, 401, "Token inválido o expirado.", "UNAUTHORIZED");
    return;
  }

  if (isMysqlError(err)) {
    switch (err.code) {
      case "ER_DUP_ENTRY":
        send(res, 409, "El registro ya existe.", "DUPLICATE_ENTRY");
        return;
      case "ER_NO_REFERENCED_ROW_2":
      case "ER_NO_REFERENCED_ROW":
        send(
          res,
          400,
          "Referencia inválida a un recurso relacionado.",
          "INVALID_REFERENCE"
        );
        return;
      case "ER_ROW_IS_REFERENCED_2":
      case "ER_ROW_IS_REFERENCED":
        send(
          res,
          409,
          "No se puede eliminar: el recurso tiene datos relacionados.",
          "RESOURCE_IN_USE"
        );
        return;
      default:
        console.error("[Error de base de datos]", err.code, err.sqlMessage);
        send(res, 500, "Error interno del servidor", "DATABASE_ERROR");
        return;
    }
  }

  console.error("[Error no manejado]", err);
  send(res, 500, "Error interno del servidor", "INTERNAL_ERROR");
}
