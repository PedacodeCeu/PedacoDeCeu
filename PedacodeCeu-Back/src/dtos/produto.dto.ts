import { z } from "zod";
import { booleanoDeFormulario, textoObrigatorio } from "./comum.dto";

const MSG_PRECO = "Preço inválido";

// O produto chega como multipart/form-data (por causa da imagem), então tudo vem como texto:
// o preço é convertido para número e os booleanos aceitam "true"/true.
const camposProduto = {
  nome: textoObrigatorio("Nome é obrigatório"),
  descricao: textoObrigatorio("Descrição é obrigatória"),
  preco: z.coerce.number({ error: MSG_PRECO }).positive({ error: MSG_PRECO }),
  destaque: booleanoDeFormulario,
  // A existência da categoria é conferida no service (404), aqui só o formato.
  categoriaId: z.string().optional(),
};

export const CriarProdutoSchema = z.object(camposProduto);

export type CriarProdutoDTO = z.infer<typeof CriarProdutoSchema>;

export const AtualizarProdutoSchema = z.object({
  ...camposProduto,
  ativo: booleanoDeFormulario,
});

export type AtualizarProdutoDTO = z.infer<typeof AtualizarProdutoSchema>;
