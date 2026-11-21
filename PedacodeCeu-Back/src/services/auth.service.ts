import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";
import { ForbiddenError, UnauthorizedError } from "../errors/AppError";
import { LoginDTO, RespostaAuthDTO } from "../dtos/auth.dto";
import { paraUsuarioSessao } from "../dtos/usuario.dto";
import { UsuarioPayload } from "../types";

const MSG_CREDENCIAIS = "Credenciais inválidas";

function gerarToken(usuario: Usuario): string {
  const payload: UsuarioPayload = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    role: usuario.role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: "1d" });
}

class AuthService {
  // Login do site. Com somenteAdmin = true, é o login da área administrativa.
  static async login({ email, senha }: LoginDTO, somenteAdmin = false): Promise<RespostaAuthDTO> {
    const usuario = await Usuario.findOne({ where: { email } });

    // Mesma mensagem para "e-mail não existe" e "senha errada": não revela quais e-mails estão cadastrados.
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
      throw new UnauthorizedError(MSG_CREDENCIAIS);
    }

    // O papel só é conferido depois da senha. Antes, o login de admin respondia 403 para qualquer
    // e-mail de usuário comum sem conferir a senha, o que revelava quais e-mails existiam.
    if (somenteAdmin && usuario.role !== "admin") {
      throw new ForbiddenError("Acesso restrito a administradores");
    }

    return { token: gerarToken(usuario), usuario: paraUsuarioSessao(usuario) };
  }
}

export default AuthService;
