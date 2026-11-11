import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  // Limpa sobras de execuções anteriores antes de começar (ver tests/e2e/global-setup.ts)
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  retries: 0,
  workers: 1, // sequencial — evita conflito de dados no banco
  reporter: 'list',

  use: {
    baseURL: 'https://pedacodeceu.local',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'off',
    // O certificado local (mkcert) é confiável para o navegador, mas não para as chamadas
    // de API que os testes fazem pelo Node (request). Só vale para o site local de testes.
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});