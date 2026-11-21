import { NextFunction, Request, Response } from "express";
import { randomUUID } from "crypto";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const requestId = randomUUID().slice(0, 8);
  res.locals.requestId = requestId;
  res.setHeader("X-Request-Id", requestId);

  const inicio = process.hrtime.bigint();

  res.on("finish", () => {
    if (process.env.NODE_ENV === "test") return;

    const duracaoMs = Number(process.hrtime.bigint() - inicio) / 1e6;
    const nivel =
      res.statusCode >= 500 ? "ERROR" : res.statusCode >= 400 ? "WARN" : "INFO";

    console.log(
      `[http] ${nivel} ${requestId} ${req.method} ${req.originalUrl} ${res.statusCode} ${duracaoMs.toFixed(1)}ms`
    );
  });

  next();
}