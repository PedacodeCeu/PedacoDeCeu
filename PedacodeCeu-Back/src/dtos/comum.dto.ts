import { z } from "zod";

// ---------- Entrada ----------

// Valores ausentes ou inválidos (texto, zero, negativos) voltam para o padrão em vez de dar erro.
export const PaginacaoSchema = z.object({
  pagina: z.coerce.number().int().positive().catch(1),
  limite: z.coerce.number().int().positive().catch(10),
});

export type PaginacaoDTO = z.infer<typeof PaginacaoSchema>;

// Campo de texto obrigatório: tira os espaços das pontas e não aceita vazio.
export function textoObrigatorio(mensagem: string) {
  return z.string({ error: mensagem }).trim().min(1, { error: mensagem });
}

// Campos booleanos que chegam tanto em JSON (true) quanto em multipart/form-data ("true").
// Qualquer outro valor, inclusive campo ausente, vira false.
// (O .optional() é necessário: no zod 4, sem ele a chave ausente é rejeitada.)
export const booleanoDeFormulario = z
  .any()
  .optional()
  .transform((valor) => valor === true || valor === "true");

// ---------- Saída ----------

export type RespostaPaginada<T> = {
  dados: T[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
};

export function paraRespostaPaginada<T>(dados: T[], total: number, { pagina, limite }: PaginacaoDTO): RespostaPaginada<T> {
  return {
    dados,
    meta: {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite),
    },
  };
}
