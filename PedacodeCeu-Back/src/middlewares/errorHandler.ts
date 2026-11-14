import { ErrorRequestHandler, RequestHandler } from "express";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { AppError } from "../errors/AppError";

export const rotaNaoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ message: "Rota não encontrada" });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const requestId = res.locals.requestId;

  if (err instanceof AppError) {
    console.warn(`[erro] ${requestId} ${err.statusCode} ${err.message}`);
    res.status(err.statusCode).json({ message: err.message });
    return;
  }

  if (err instanceof ForeignKeyConstraintError) {
    console.warn(`[erro] ${requestId} 409 violação de chave estrangeira`);
    res.status(409).json({
      message: "Registro está em uso por outros dados e não pode ser removido",
    });
    return;
  }

  if (err instanceof UniqueConstraintError) {
    console.warn(`[erro] ${requestId} 409 valor duplicado`);
    res.status(409).json({ message: "Já existe um registro com esses dados" });
    return;
  }

  if (err?.type === "entity.parse.failed") {
    console.warn(`[erro] ${requestId} 400 JSON inválido`);
    res.status(400).json({ message: "JSON inválido" });
    return;
  }

  if (err?.name === "MulterError" || err?.message?.includes("imagem") || err?.message?.includes("Extensão")) {
    console.warn(`[erro] ${requestId} 400 upload: ${err.message}`);
    res.status(400).json({ message: err.message });
    return;
  }

  console.error(`[erro] ${requestId} 500 ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: "Erro interno do servidor", requestId });
};