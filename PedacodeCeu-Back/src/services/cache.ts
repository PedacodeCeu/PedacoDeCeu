import redis from "../config/redis";

const TTL_SEGUNDOS = Number(process.env.CACHE_TTL) || 60;

export async function lerCache<T>(chave: string): Promise<T | null> {
  try {
    const valor = await redis.get(chave);
    if (valor) {
      console.log(`[cache] HIT ${chave}`);
      return JSON.parse(valor) as T;
    }
    console.log(`[cache] MISS ${chave}`);
    return null;
  } catch (err) {
    console.error("[cache] erro ao ler:", (err as Error).message);
    return null;
  }
}

export async function salvarCache(chave: string, valor: unknown): Promise<void> {
  try {
    await redis.set(chave, JSON.stringify(valor), "EX", TTL_SEGUNDOS);
  } catch (err) {
    console.error("[cache] erro ao salvar:", (err as Error).message);
  }
}

export async function invalidarCache(prefixo: string): Promise<void> {
  try {
    const chaves: string[] = [];
    for await (const lote of redis.scanStream({ match: `${prefixo}*`, count: 100 })) {
      chaves.push(...lote);
    }
    if (chaves.length > 0) await redis.del(...chaves);
    console.log(`[cache] INVALIDADO ${prefixo}* (${chaves.length} chaves)`);
  } catch (err) {
    console.error("[cache] erro ao invalidar:", (err as Error).message);
  }
}