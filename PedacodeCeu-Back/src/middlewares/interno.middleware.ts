import { NextFunction, Request, Response } from "express";

// Protege rotas usadas só entre serviços (não pelo navegador).
// O chamador precisa enviar o cabeçalho X-Internal-Token com o mesmo valor de INTERNAL_TOKEN.
// O nginx também bloqueia /api/internal/, então essas rotas não ficam expostas pelo site.
export default function internoMiddleware(req: Request, res: Response, next: NextFunction) {
  const esperado = process.env.INTERNAL_TOKEN;

  if (!esperado) {
    console.error("[interno] INTERNAL_TOKEN não configurado; rota interna desativada");
    return res.status(503).json({ message: "Rota interna não configurada" });
  }

  if (req.headers["x-internal-token"] !== esperado) {
    return res.status(401).json({ message: "Token interno inválido" });
  }

  return next();
}
