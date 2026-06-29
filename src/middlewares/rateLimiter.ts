import { type Request, type Response, type NextFunction } from "express";

const requestCounts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 10;

export function rateLimiter(req: Request, res: Response, next: NextFunction) {
  const key = req.headers.authorization ?? req.ip ?? "anon";
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });

    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    res.setHeader("Retry-After", Math.ceil((entry.resetAt - now) / 1000));

    return res.status(429).json({
      error: "Demasiadas peticiones. Intenta mas tarde.",
    });
  }

  entry.count++;
  next();
}