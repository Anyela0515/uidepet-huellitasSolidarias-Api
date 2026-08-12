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

function humanizeZodMessage(issue: {
  path: (string | number)[];
  message: string;
  code?: string;
}): string {
  const path = issue.path.join(".");
  const isEvidence =
    path.includes("evidencias") ||
    path.includes("archivos") ||
    path.endsWith("type") ||
    path.endsWith("url") ||
    path.endsWith("size");

  if (isEvidence) {
    if (/invalid_enum|Invalid enum|Expected .*image\/jpeg/i.test(issue.message)) {
      if (/application\/pdf/i.test(issue.message)) {
        return "El contrato firmado (PDF) no pudo enviarse con las fotos del hogar. Vuelve a subir el PDF en Compromiso y deja solo JPG/PNG o MP4 en Evidencias.";
      }
      return "Una de las evidencias del hogar no es válida. Solo se aceptan JPG, PNG o MP4.";
    }
    if (/^Invalid$/i.test(issue.message) || /Invalid input|invalid_union/i.test(issue.message)) {
      return "Revisa las evidencias: las fotos del hogar deben ser JPG o PNG (o un video MP4) y el contrato firmado debe ser PDF.";
    }
    if (/base64|regex|Invalid/i.test(issue.message) && path.includes("url")) {
      return "Una de las fotos/videos del hogar está corrupta o no tiene un formato permitido.";
    }
  }

  if (path.includes("localidadId")) {
    return "Debes elegir provincia, cantón y parroquia.";
  }

  return issue.message;
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
      message: humanizeZodMessage(e),
    }));
    const primary =
      details.find((d) => d.message)?.message || "Datos de entrada inválidos.";
    send(res, 422, primary, "VALIDATION_ERROR", details);
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
