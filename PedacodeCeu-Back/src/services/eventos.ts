import redis from "../config/redis";

const CANAIS: string[] = ["produto.criado", "pedido.criado"];


export async function publicarEvento(
  canal: string,
  dados: Record<string, unknown>
): Promise<void> {
  try {
    const mensagem = JSON.stringify({
      evento: canal,
      dados,
      publicadoEm: new Date().toISOString(),
    });
    const receptores = await redis.publish(canal, mensagem);
    console.log(`[pubsub] PUBLICADO ${canal} (${receptores} assinante(s)) ${mensagem}`);
  } catch (err) {
    console.error("[pubsub] erro ao publicar:", (err as Error).message);
  }
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
    .subscribe(...CANAIS)
    .then(() => console.log(`[pubsub] assinando: ${CANAIS.join(", ")}`))
    .catch((err) =>
      console.error("[pubsub] erro ao assinar:", (err as Error).message)
    );
}


function tratarEvento(canal: string, mensagem: string): void {
  try {
    const { dados } = JSON.parse(mensagem);

    if (canal === "pedido.criado") {
      console.log(
        `[notificacao] (simulada) Pedido ${dados.pedidoId} criado, total R$ ${dados.total}`
      );
    } else if (canal === "produto.criado") {
      console.log(`[notificacao] (simulada) Novo produto no catálogo: ${dados.nome}`);
    }
  } catch (err) {
    console.error("[pubsub] mensagem inválida:", (err as Error).message);
  }
}