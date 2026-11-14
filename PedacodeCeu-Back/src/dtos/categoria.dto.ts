import { z } from "zod";
import { textoObrigatorio } from "./comum.dto";

// Criar e atualizar usam o mesmo formato.
export const CategoriaSchema = z.object({
  nome: textoObrigatorio("Nome é obrigatório"),
});

export type CategoriaDTO = z.infer<typeof CategoriaSchema>;
