import { ErrorRequestHandler } from "express";
import { removerImagem } from "../config/upload";

// O multer grava a imagem em disco ANTES do controller rodar.
// Se a requisição falhar depois disso (validação, categoria inexistente, produto inexistente...),
// a imagem enviada ficaria órfã na pasta de uploads. Este middleware de erro apaga o arquivo
// e repassa o erro para o errorHandler, então nenhum controller ou service precisa se preocupar com isso.
export const limparUploadEmErro: ErrorRequestHandler = async (err, req, _res, next) => {
  if (req.file) {
    await removerImagem(req.file.filename);
  }
  next(err);
};
