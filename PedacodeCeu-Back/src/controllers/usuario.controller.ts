import { Request, Response } from "express";
import bcrypt from "bcrypt";
import Usuario from "../models/Usuario";
import { AuthRequest } from "../middlewares/auth.middlewares";

class UsuarioController {
  static async findAll(req: Request, res: Response) {
    const usuarios = await Usuario.findAll({
      attributes: ["id", "nome", "email", "cpf", "createdAt"],
    });
    return res.status(200).json(usuarios);
  }

  static async getById(req: AuthRequest, res: Response) {
  const id = String(req.params.id);

  if (req.usuario?.id !== id && req.usuario?.role !== "admin") {
    return res.status(403).json({ message: "Acesso negado" });
  }

  const usuario = await Usuario.findByPk(id, {
    attributes: ["id", "nome", "email", "cpf", "createdAt"],
  });

    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(200).json(usuario);
  }

  static async create(req: Request, res: Response) {
    const { nome, email, senha, cpf } = req.body;

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    if (!email || !validarEmail(email)) {
      return res.status(400).json({ message: "E-mail inválido" });
    }

    if (!senha || !validarSenha(senha)) {
      return res.status(400).json({
        message:
          "A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial",
      });
    }

    if (!cpf || !validarCPF(cpf)) {
      return res.status(400).json({ message: "CPF inválido" });
    }

    const emailExiste = await Usuario.findOne({ where: { email } });
    if (emailExiste) {
      return res.status(400).json({ message: "E-mail já cadastrado" });
    }

    const cpfExiste = await Usuario.findOne({ where: { cpf } });
    if (cpfExiste) {
      return res.status(400).json({ message: "CPF já cadastrado" });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);
    const usuario = await Usuario.create({
      nome,
      email,
      senha: senhaCriptografada,
      cpf,
    });

    return res.status(201).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      createdAt: usuario.createdAt,
    });
  }

  static async update(req: AuthRequest, res: Response) {
    const id = String(req.params.id);
    const { nome, senha, cpf } = req.body;

    if (req.usuario?.id !== id) {
      return res.status(403).json({
        message: "Você não tem permissão para editar este usuário",
      });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (!nome || nome.trim() === "") {
      return res.status(400).json({ message: "Nome é obrigatório" });
    }

    // Na edição a senha é opcional: em branco = manter a atual.
    // Só valida (e troca) quando o usuário digitou uma senha nova.
    const trocarSenha = typeof senha === "string" && senha !== "";
    if (trocarSenha && !validarSenha(senha)) {
      return res.status(400).json({
        message:
          "A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial",
      });
    }

    if (!cpf || !validarCPF(cpf)) {
      return res.status(400).json({ message: "CPF inválido" });
    }

    // O CPF é único no banco: sem esta checagem, usar o CPF de outro usuário
    // estourava um erro 500 do MySQL em vez de uma mensagem clara.
    if (cpf !== usuario.cpf) {
      const cpfExiste = await Usuario.findOne({ where: { cpf } });
      if (cpfExiste && cpfExiste.id !== usuario.id) {
        return res.status(400).json({ message: "CPF já cadastrado" });
      }
    }

    const dados: { nome: string; cpf: string; senha?: string } = { nome: nome.trim(), cpf };
    if (trocarSenha) {
      dados.senha = await bcrypt.hash(senha, 10);
    }
    await usuario.update(dados);

    return res.status(200).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      cpf: usuario.cpf,
      updatedAt: usuario.updatedAt,
    });
  }

  // ✅ NOVO MÉTODO ADICIONADO
  static async updateRole(req: AuthRequest, res: Response) {
    const id = String(req.params.id);
    const { role } = req.body;

    if (!role || !["usuario", "admin"].includes(role)) {
      return res.status(400).json({ message: "Role inválido" });
    }

    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await usuario.update({ role });

    return res.status(200).json({
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
    });
  }

  static async remove(req: Request, res: Response) {
    const id = String(req.params.id);
    const usuario = await Usuario.findByPk(id);
    if (!usuario) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    await usuario.destroy();
    return res.status(204).send();
  }
}

function validarEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function validarSenha(senha: string): boolean {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
  return regex.test(senha);
}

function validarCPF(cpf: string): boolean {
  const limpo = cpf.replace(/[^\d]/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  return true;
}

export default UsuarioController;