import bcrypt from "bcrypt";
import Usuario from "../models/Usuario";
import { ConflictError, ForbiddenError, NotFoundError } from "../errors/AppError";
import { UsuarioPayload } from "../types";
import {
  AlterarRoleDTO,
  AtualizarUsuarioDTO,
  CriarUsuarioDTO,
  paraUsuarioAtualizado,
  paraUsuarioPublico,
  paraUsuarioRole,
  UsuarioAtualizadoDTO,
  UsuarioPublicoDTO,
  UsuarioRoleDTO,
} from "../dtos/usuario.dto";

const RODADAS_BCRYPT = 10;

async function buscarOuFalhar(id: string): Promise<Usuario> {
  const usuario = await Usuario.findByPk(id);
  if (!usuario) {
    throw new NotFoundError("Usuário não encontrado");
  }
  return usuario;
}

async function garantirCpfLivre(cpf: string, idIgnorado?: string): Promise<void> {
  const existente = await Usuario.findOne({ where: { cpf } });
  if (existente && existente.id !== idIgnorado) {
    throw new ConflictError("CPF já cadastrado");
  }
}

class UsuarioService {
  static async listar(): Promise<UsuarioPublicoDTO[]> {
    const usuarios = await Usuario.findAll({ attributes: ["id", "nome", "email", "cpf", "createdAt"] });
    return usuarios.map(paraUsuarioPublico);
  }

  // Cada usuário só vê os próprios dados; o admin vê qualquer um.
  static async buscarPorId(id: string, solicitante: UsuarioPayload): Promise<UsuarioPublicoDTO> {
    if (solicitante.id !== id && solicitante.role !== "admin") {
      throw new ForbiddenError("Acesso negado");
    }
    return paraUsuarioPublico(await buscarOuFalhar(id));
  }

  static async criar(dados: CriarUsuarioDTO): Promise<UsuarioPublicoDTO> {
    if (await Usuario.findOne({ where: { email: dados.email } })) {
      throw new ConflictError("E-mail já cadastrado");
    }
    await garantirCpfLivre(dados.cpf);

    const usuario = await Usuario.create({
      nome: dados.nome,
      email: dados.email,
      senha: await bcrypt.hash(dados.senha, RODADAS_BCRYPT),
      cpf: dados.cpf,
    });

    return paraUsuarioPublico(usuario);
  }

  // Só o próprio usuário edita os seus dados (nem o admin edita os de outro).
  static async atualizar(
    id: string,
    dados: AtualizarUsuarioDTO,
    solicitante: UsuarioPayload
  ): Promise<UsuarioAtualizadoDTO> {
    if (solicitante.id !== id) {
      throw new ForbiddenError("Você não tem permissão para editar este usuário");
    }

    const usuario = await buscarOuFalhar(id);

    if (dados.cpf !== usuario.cpf) {
      await garantirCpfLivre(dados.cpf, usuario.id);
    }

    await usuario.update({
      nome: dados.nome,
      cpf: dados.cpf,
      // Senha ausente ou em branco = manter a atual (o DTO já converte para undefined).
      ...(dados.senha && { senha: await bcrypt.hash(dados.senha, RODADAS_BCRYPT) }),
    });

    return paraUsuarioAtualizado(usuario);
  }

  static async alterarRole(id: string, { role }: AlterarRoleDTO): Promise<UsuarioRoleDTO> {
    const usuario = await buscarOuFalhar(id);
    await usuario.update({ role });
    return paraUsuarioRole(usuario);
  }

  static async remover(id: string): Promise<void> {
    const usuario = await buscarOuFalhar(id);
    await usuario.destroy();
  }
}

export default UsuarioService;
