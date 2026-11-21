import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import { UsuarioPayload } from "../types";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../errors/AppError";

export interface AuthRequest extends Request {
  usuario?: UsuarioPayload;
}

// Lê o token "Bearer <jwt>", confere a assinatura e se o usuário ainda existe no banco.
// Qualquer falha vira um AppError, que o errorHandler transforma na resposta HTTP.
async function autenticar(req: AuthRequest): Promise<Usuario> {
  const cabecalho = req.headers.authorization;

  if (!cabecalho) {
    throw new UnauthorizedError("Token não fornecido");
  }

  const partes = cabecalho.split(" ");
  if (partes.length !== 2) {
    throw new UnauthorizedError("Token inválido");
  }

  let decoded: UsuarioPayload;
  try {
    decoded = jwt.verify(partes[1], process.env.JWT_SECRET as string) as UsuarioPayload;
  } catch {
    throw new UnauthorizedError("Token inválido ou expirado");
  }

  const usuario = await Usuario.findByPk(decoded.id);
  if (!usuario) {
    throw new NotFoundError("Usuário não encontrado");
  }

  req.usuario = decoded;
  return usuario;
}

async function authMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  await autenticar(req);
  next();
}

// O papel é conferido no banco, não no token: quem perdeu o admin perde o acesso na hora.
export async function adminMiddleware(req: AuthRequest, _res: Response, next: NextFunction) {
  const usuario = await autenticar(req);

  if (usuario.role !== "admin") {
    throw new ForbiddenError("Acesso restrito a administradores");
  }

  next();
}

export default authMiddleware;
