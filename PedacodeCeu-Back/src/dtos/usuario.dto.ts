import { z } from "zod";
import Usuario from "../models/Usuario";
import { textoObrigatorio } from "./comum.dto";

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REGEX_SENHA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;

const MSG_EMAIL = "E-mail inválido";
const MSG_SENHA =
  "A senha deve ter no mínimo 8 caracteres, letra maiúscula, minúscula, número e caractere especial";
const MSG_CPF = "CPF inválido";

export const ROLES = ["usuario", "admin"] as const;

function cpfValido(cpf: string): boolean {
  const limpo = cpf.replace(/[^\d]/g, "");
  if (limpo.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(limpo)) return false;
  return true;
}

export const emailSchema = z.string({ error: MSG_EMAIL }).regex(REGEX_EMAIL, { error: MSG_EMAIL });

const cpfSchema = z.string({ error: MSG_CPF }).refine(cpfValido, { error: MSG_CPF });

// ---------- Entrada ----------

export const CriarUsuarioSchema = z.object({
  nome: textoObrigatorio("Nome é obrigatório"),
  email: emailSchema,
  senha: z.string({ error: MSG_SENHA }).regex(REGEX_SENHA, { error: MSG_SENHA }),
  cpf: cpfSchema,
});

export type CriarUsuarioDTO = z.infer<typeof CriarUsuarioSchema>;

export const AtualizarUsuarioSchema = z.object({
  nome: textoObrigatorio("Nome é obrigatório"),
  // Na edição a senha é opcional: em branco ou ausente = manter a atual.
  senha: z
    .string()
    .nullish()
    .refine((s) => !s || REGEX_SENHA.test(s), { error: MSG_SENHA })
    .transform((s) => s || undefined),
  cpf: cpfSchema,
});

export type AtualizarUsuarioDTO = z.infer<typeof AtualizarUsuarioSchema>;

export const AlterarRoleSchema = z.object({
  role: z.enum(ROLES, { error: "Role inválido" }),
});

export type AlterarRoleDTO = z.infer<typeof AlterarRoleSchema>;

// ---------- Saída ----------
// Nunca devolvemos a senha (nem o hash). Cada rota mantém o formato que o front já usa.

export type UsuarioPublicoDTO = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  createdAt: Date;
};

export type UsuarioAtualizadoDTO = Omit<UsuarioPublicoDTO, "createdAt"> & { updatedAt: Date };

export type UsuarioSessaoDTO = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: string;
};

export type UsuarioRoleDTO = Omit<UsuarioSessaoDTO, "cpf">;

export function paraUsuarioPublico(u: Usuario): UsuarioPublicoDTO {
  return { id: u.id, nome: u.nome, email: u.email, cpf: u.cpf, createdAt: u.createdAt };
}

export function paraUsuarioAtualizado(u: Usuario): UsuarioAtualizadoDTO {
  return { id: u.id, nome: u.nome, email: u.email, cpf: u.cpf, updatedAt: u.updatedAt };
}

export function paraUsuarioSessao(u: Usuario): UsuarioSessaoDTO {
  return { id: u.id, nome: u.nome, email: u.email, cpf: u.cpf, role: u.role };
}

export function paraUsuarioRole(u: Usuario): UsuarioRoleDTO {
  return { id: u.id, nome: u.nome, email: u.email, role: u.role };
}
