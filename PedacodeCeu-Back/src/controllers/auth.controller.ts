import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Usuario from "../models/Usuario";

class AuthController {
  static async login(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !validarEmail(email)) {
        return res.status(400).json({ message: "E-mail inválido" });
      }

      if (!senha) {
        return res.status(400).json({ message: "Senha é obrigatória" });
      }

      const usuario = await Usuario.findOne({ where: { email } });

      if (!usuario) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cpf: usuario.cpf,
          role: usuario.role,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "Erro interno" });
    }
  }

  static async loginAdmin(req: Request, res: Response) {
    try {
      const { email, senha } = req.body;

      if (!email || !validarEmail(email)) {
        return res.status(400).json({ message: "E-mail inválido" });
      }

      if (!senha) {
        return res.status(400).json({ message: "Senha é obrigatória" });
      }

      const usuario = await Usuario.findOne({ where: { email } });

      if (!usuario) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      if (usuario.role !== "admin") {
        return res.status(403).json({ message: "Acesso restrito a administradores" });
      }

      const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

      if (!senhaCorreta) {
        return res.status(401).json({ message: "Credenciais inválidas" });
      }

      const token = jwt.sign(
        { id: usuario.id, nome: usuario.nome, email: usuario.email, role: usuario.role },
        process.env.JWT_SECRET as string,
        { expiresIn: "1d" }
      );

      return res.status(200).json({
        token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          cpf: usuario.cpf,
          role: usuario.role,
        },
      });
    } catch (err) {
      return res.status(500).json({ message: "Erro interno" });
    }
  }
}

function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

export default AuthController;