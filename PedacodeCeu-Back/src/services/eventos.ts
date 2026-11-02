import { randomUUID } from "crypto";
import redis from "../config/redis";

// Canais de eventos publicados pelo back (Redis Pub/Sub).
// O nome do canal é o contrato com quem assina: não renomear sem avisar os outros serviços.
export const CANAIS = {
  PEDIDO_ENTREGUE: "pedido.entregue",
} as const;

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

// Publica um evento sem derrubar a requisição se o Redis estiver fora do ar:
// o pedido já foi salvo no MySQL, então uma falha aqui só é logada.
// O serviço de avaliações tem uma verificação HTTP de reserva para esse caso.
export async function publicarEvento<T>(canal: string, dados: T): Promise<void> {
  const envelope: Envelope<T> = {
    id: randomUUID(),
    tipo: canal,
    ocorridoEm: new Date().toISOString(),
    dados,
  };

  try {
    const assinantes = await redis.publish(canal, JSON.stringify(envelope));
    console.log(`[evento] PUBLICADO ${canal} id=${envelope.id} assinantes=${assinantes}`);
  } catch (err) {
    console.error(`[evento] FALHA ao publicar ${canal} id=${envelope.id}:`, (err as Error).message);
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
