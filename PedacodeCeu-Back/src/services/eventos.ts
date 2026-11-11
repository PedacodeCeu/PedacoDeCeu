import { randomUUID } from "crypto";
import redis from "../config/redis";

// Mensageria do back via Redis Pub/Sub.
// O nome do canal é o contrato com quem assina: não renomear sem avisar os outros serviços.
export const CANAIS = {
  PRODUTO_CRIADO: "produto.criado",
  PEDIDO_CRIADO: "pedido.criado",
  // Assinado pelo microsserviço de avaliações (PedacodeCeu-Avaliacoes)
  PEDIDO_ENTREGUE: "pedido.entregue",
} as const;

// Canais que o próprio back assina (notificações simuladas no log)
const CANAIS_ASSINADOS: string[] = [CANAIS.PRODUTO_CRIADO, CANAIS.PEDIDO_CRIADO];

export type EventoPedidoEntregue = {
  pedidoId: string;
  usuarioId: string;
  produtoIds: string[];
};

// Formato de toda mensagem publicada. O microsserviço de avaliações valida
// exatamente estes campos (id, tipo, ocorridoEm, dados), então não mude sem atualizar lá.
type Envelope<T> = {
  id: string;
  tipo: string;
  ocorridoEm: string;
  dados: T;
};

// Publica um evento sem derrubar a requisição se o Redis estiver fora do ar:
// o dado já foi salvo no MySQL, então uma falha aqui só é logada.
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
  // Conexão separada: no Redis, uma conexão inscrita em canais não pode fazer outros comandos
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
