import { randomUUID } from "crypto";
import redis from "../config/redis";

export const CANAIS = {
  PRODUTO_CRIADO: "produto.criado",
  PEDIDO_CRIADO: "pedido.criado",
  PEDIDO_ENTREGUE: "pedido.entregue",
} as const;

const CANAIS_ASSINADOS: string[] = [CANAIS.PRODUTO_CRIADO, CANAIS.PEDIDO_CRIADO];

export type EventoPedidoEntregue = {
  pedidoId: string;
  usuarioId: string;
  produtoIds: string[];
};

type Envelope<T> = {
  id: string;
  tipo: string;
  ocorridoEm: string;
  dados: T;
};

export async function publicarEvento<T>(canal: string, dados: T): Promise<void> {
  const envelope: Envelope<T> = {
    id: randomUUID(),
    tipo: canal,
    ocorridoEm: new Date().toISOString(),
    dados,
  };

  try {
    const assinantes = await redis.publish(canal, JSON.stringify(envelope));
    console.log(`[pubsub] PUBLICADO ${canal} id=${envelope.id} (${assinantes} assinante(s)) ${JSON.stringify(dados)}`);
  } catch (err) {
    console.error(`[pubsub] erro ao publicar ${canal}:`, (err as Error).message);
  }
}

export async function publicarPedidoEntregue(pedidoId: string, usuarioId: string, produtoIds: string[]) {
  const unicos = [...new Set(produtoIds)];
  await publicarEvento<EventoPedidoEntregue>(CANAIS.PEDIDO_ENTREGUE, {
    pedidoId,
    usuarioId,
    produtoIds: unicos,
  });
}

export function iniciarAssinante(): void {
  const assinante = redis.duplicate();

  assinante.on("error", (err) =>
    console.error("[pubsub] erro no assinante:", err.message)
  );

  assinante.on("message", (canal, mensagem) => {
    console.log(`[pubsub] RECEBIDO ${canal} ${mensagem}`);
    tratarEvento(canal, mensagem);
  });

  assinante
    .subscribe(...CANAIS_ASSINADOS)
    .then(() => console.log(`[pubsub] assinando: ${CANAIS_ASSINADOS.join(", ")}`))
    .catch((err) =>
      console.error("[pubsub] erro ao assinar:", (err as Error).message)
    );
}

function tratarEvento(canal: string, mensagem: string): void {
  try {
    const { dados } = JSON.parse(mensagem);

    if (canal === CANAIS.PEDIDO_CRIADO) {
      console.log(
        `[notificacao] (simulada) Pedido ${dados.pedidoId} criado, total R$ ${dados.total}`
      );
    } else if (canal === CANAIS.PRODUTO_CRIADO) {
      console.log(`[notificacao] (simulada) Novo produto no catálogo: ${dados.nome}`);
    }
  } catch (err) {
    console.error("[pubsub] mensagem inválida:", (err as Error).message);
  }
}
