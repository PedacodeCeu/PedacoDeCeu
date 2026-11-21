import { z } from "zod";
import { emailSchema, UsuarioSessaoDTO } from "./usuario.dto";

const MSG_SENHA = "Senha é obrigatória";

// ---------- Entrada ----------

export const LoginSchema = z.object({
  email: emailSchema,
  senha: z.string({ error: MSG_SENHA }).min(1, { error: MSG_SENHA }),
});

export type LoginDTO = z.infer<typeof LoginSchema>;

// ---------- Saída ----------

export type RespostaAuthDTO = {
  token: string;
  usuario: UsuarioSessaoDTO;
};
