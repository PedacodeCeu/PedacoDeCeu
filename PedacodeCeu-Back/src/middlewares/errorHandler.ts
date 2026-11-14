import { ErrorRequestHandler, RequestHandler } from "express";
import { MulterError } from "multer";
import { ForeignKeyConstraintError, UniqueConstraintError } from "sequelize";
import { AppError } from "../errors/AppError";
import { TAMANHO_MAXIMO } from "../config/upload";

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

  // Erros do próprio multer (arquivo grande demais, campo de arquivo inesperado...).
  // Os erros de extensão/tipo de arquivo já chegam como BadRequestError, lançados no config/upload.ts.
  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? `A imagem deve ter no máximo ${TAMANHO_MAXIMO / (1024 * 1024)}MB`
        : `Erro no envio do arquivo: ${err.message}`;
    console.warn(`[erro] ${requestId} 400 upload: ${err.code}`);
    res.status(400).json({ message });
    return;
  }

  console.error(`[erro] ${requestId} 500 ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ message: "Erro interno do servidor", requestId });
};