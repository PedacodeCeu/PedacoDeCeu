import { z } from "zod";
import { BadRequestError } from "../errors/AppError";

// Valida dados de entrada (body, query) contra o schema de um DTO.
// Se passar, devolve os dados já convertidos e tipados.
// Se falhar, lança BadRequestError com a primeira mensagem, que o errorHandler transforma em 400.
export function validar<S extends z.ZodType>(schema: S, dados: unknown): z.infer<S> {
  // No Express 5, req.body fica undefined quando a requisição não tem corpo.
  const resultado = schema.safeParse(dados ?? {});

  if (!resultado.success) {
    throw new BadRequestError(resultado.error.issues[0]?.message);
  }

  return resultado.data;
}
