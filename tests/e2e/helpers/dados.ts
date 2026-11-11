// Geradores de dados únicos por execução.
// Nada que o back exige ser único (CPF, e-mail, nomes) pode ser fixo nos testes,
// senão o teste só passa na primeira vez que roda num banco.

// Prefixo de tudo que os testes criam. O global-setup usa este prefixo para
// limpar sobras de execuções interrompidas (ex.: Ctrl+C no meio dos testes).
export const PREFIXO = 'E2E';
export const DOMINIO_EMAIL = '@playwright.com';

export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@testepedacodoceu.com';
export const ADMIN_SENHA = process.env.E2E_ADMIN_SENHA ?? 'Admin@123';
export const SENHA_PADRAO = 'Senha@123';

let contador = 0;

/** Sufixo único: horário + contador + aleatório (evita colisão entre testes no mesmo milissegundo). */
export function unico(): string {
  contador += 1;
  return `${Date.now()}${contador}${Math.floor(Math.random() * 1000)}`;
}

export function nomeTeste(tipo: string): string {
  return `${PREFIXO} ${tipo} ${unico()}`;
}

export function gerarEmail(prefixo = 'teste'): string {
  return `${prefixo}.${unico()}${DOMINIO_EMAIL}`;
}

function digitoVerificador(base: number[]): number {
  // Pesos decrescentes: 10..2 para o 1º dígito, 11..2 para o 2º
  const soma = base.reduce((acc, digito, i) => acc + digito * (base.length + 1 - i), 0);
  const resto = (soma * 10) % 11;
  return resto === 10 ? 0 : resto;
}

/** CPF válido (com dígitos verificadores corretos) e diferente a cada chamada. */
export function gerarCPF(formatado = true): string {
  const digitos = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (digitos.every((d) => d === digitos[0])) digitos[8] = (digitos[8] + 1) % 10; // evita 111.111.111-xx
  digitos.push(digitoVerificador(digitos));
  digitos.push(digitoVerificador(digitos));

  const s = digitos.join('');
  return formatado ? `${s.slice(0, 3)}.${s.slice(3, 6)}.${s.slice(6, 9)}-${s.slice(9)}` : s;
}
