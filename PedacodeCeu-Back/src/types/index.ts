export type UsuarioPayload = {
  id: string;
  nome?: string;
  email: string;
  role: "usuario" | "admin";
};
