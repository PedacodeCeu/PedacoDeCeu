export type UsuarioPayload = {
  id: string;
  nome?: string;
  email: string;
  role: "usuario" | "admin";
};

export type RespostaPaginada<T> = {
  dados: T[];
  meta: {
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
  };
};

export type RespostaCriarUsuario = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  createdAt: Date;
};

export type RespostaUsuario = {
  id: string;
  nome: string;
  email: string;
  cpf: string;
  role: string;
};

export type RespostaAuth = {
  token: string;
  usuario: RespostaUsuario;
};