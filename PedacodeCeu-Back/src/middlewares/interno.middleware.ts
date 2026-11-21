import { NextFunction, Request, Response } from "express";
import { AppError, UnauthorizedError } from "../errors/AppError";

// Protege rotas usadas só entre serviços (não pelo navegador).
// O chamador precisa enviar o cabeçalho X-Internal-Token com o mesmo valor de INTERNAL_TOKEN.
// O nginx também bloqueia /api/internal/, então essas rotas não ficam expostas pelo site.
export default function internoMiddleware(req: Request, _res: Response, next: NextFunction) {
  const esperado = process.env.INTERNAL_TOKEN;

  if (!esperado) {
    console.error("[interno] INTERNAL_TOKEN não configurado; rota interna desativada");
    throw new AppError(503, "Rota interna não configurada");
  }

  if (req.headers["x-internal-token"] !== esperado) {
    throw new UnauthorizedError("Token interno inválido");
  }

  next();
}
