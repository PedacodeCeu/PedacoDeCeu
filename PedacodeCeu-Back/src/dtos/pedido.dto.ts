import { z } from "zod";

export const STATUS_PEDIDO = ["pendente", "confirmado", "entregue", "cancelado"] as const;

export type StatusPedido = (typeof STATUS_PEDIDO)[number];

const MSG_SEM_ITENS = "O pedido deve ter ao menos um item";
const MSG_QUANTIDADE = "Quantidade inválida";

const statusSchema = z.enum(STATUS_PEDIDO, { error: "Status inválido" });

const itemSchema = z.object(
  {
    produtoId: z.union([z.string(), z.number()], { error: "Produto é obrigatório em cada item" }).transform(String),
    quantidade: z.coerce.number({ error: MSG_QUANTIDADE }).int({ error: MSG_QUANTIDADE }).positive({ error: MSG_QUANTIDADE }),
  },
  { error: "Item do pedido inválido" }
);

export type ItemPedidoDTO = z.infer<typeof itemSchema>;

// ---------- Entrada ----------

export const CriarPedidoSchema = z.object({
  // O dono do pedido vem do token, nunca do body.
  status: statusSchema.optional(),
  itens: z.array(itemSchema, { error: MSG_SEM_ITENS }).min(1, { error: MSG_SEM_ITENS }),
});

export type CriarPedidoDTO = z.infer<typeof CriarPedidoSchema>;

export const AtualizarPedidoSchema = z.object({
  status: statusSchema.optional(),
  // Lista vazia é aceita e ignorada (mantém os itens atuais), como antes.
  itens: z.array(itemSchema, { error: "Itens inválidos" }).optional(),
});

export type AtualizarPedidoDTO = z.infer<typeof AtualizarPedidoSchema>;

// Usado pela rota interna GET /internal/compras
const MSG_COMPRA = "usuarioId e produtoId são obrigatórios";

export const VerificarCompraSchema = z.object({
  usuarioId: z.string({ error: MSG_COMPRA }).min(1, { error: MSG_COMPRA }),
  produtoId: z.string({ error: MSG_COMPRA }).min(1, { error: MSG_COMPRA }),
});

export type VerificarCompraDTO = z.infer<typeof VerificarCompraSchema>;

// ---------- Saída ----------

export type RespostaVerificarCompraDTO = {
  comprou: boolean;
  pedidoId: string | null;
};
