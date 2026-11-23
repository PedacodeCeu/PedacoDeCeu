import { Request, Response } from "express";
import sequelize from "../config/database";
import redis from "../config/redis";

function comTimeout<T>(promessa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promessa,
    new Promise<T>((_, rejeitar) => setTimeout(() => rejeitar(new Error("timeout")), ms)),
  ]);
}

async function responde(verificacao: () => Promise<unknown>): Promise<boolean> {
  try {
    await comTimeout(verificacao(), 2000);
    return true;
  } catch {
    return false;
  }
}

class HealthController {
  static async check(_req: Request, res: Response) {
    const [banco, cache] = await Promise.all([
      responde(() => sequelize.authenticate()),
      responde(() => redis.ping()),
    ]);

    const status = banco && cache ? "ok" : banco ? "degradado" : "fora";
    res.status(banco ? 200 : 503).json({ status, banco, redis: cache });
  }
}

export default HealthController;