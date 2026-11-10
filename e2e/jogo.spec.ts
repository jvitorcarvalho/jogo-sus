import { expect, test, type Page } from '@playwright/test';

const erros: string[] = [];

test.beforeEach(async ({ page }) => {
  erros.length = 0;
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(m.text());
  });
  await page.goto('/');
});

test.afterEach(() => {
  expect(erros, 'a página não pode registrar erro no console').toEqual([]);
});

async function comecar(page: Page, cenario: string): Promise<void> {
  await page.getByRole('button', { name: `Jogar ${cenario}` }).click();
  await page.getByRole('button', { name: 'Começar' }).click();
}

test('a tela inicial oferece os três cenários', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Linha de Frente: SUS' })).toBeVisible();
  for (const c of ['Dengue', 'Sarampo', 'Pandemia respiratória']) {
    await expect(page.getByRole('button', { name: `Jogar ${c}` })).toBeVisible();
  }
});

test('reforçar uma frente gasta orçamento e sobe o nível', async ({ page }) => {
  await comecar(page, 'Dengue');
  await page.getByRole('button', { name: 'Pausar' }).click();
  const orcamento = page.locator('.indicador', { hasText: 'Orçamento' }).locator('strong');
  await expect(orcamento).toHaveText('100');
  await page.getByRole('button', { name: 'Reforçar · 40' }).first().click();
  await expect(orcamento).toHaveText('60');
  await expect(page.getByLabel('Nível 1 de 3')).toHaveCount(1);
  await expect(page.locator('.noticias')).toContainText('Atenção Básica reforçada');
});

test('escolher um estado mostra os dados e permite agir nele', async ({ page }) => {
  await comecar(page, 'Dengue');
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.getByLabel('Escolher estado').selectOption({ label: 'Rio de Janeiro' });
  await expect(page.locator('.dados')).toContainText('16.055.174');
  const mutirao = page.locator('.acao', { hasText: 'Mutirão contra o mosquito' }).getByRole('button');
  await mutirao.click();
  await expect(mutirao).toHaveText(/Em andamento · 45 dias/);
  await expect(mutirao).toBeDisabled();
});

test('o mapa tem os 27 estados e o clique seleciona', async ({ page }) => {
  await comecar(page, 'Sarampo');
  await page.getByRole('button', { name: 'Pausar' }).click();
  await expect(page.locator('path.uf')).toHaveCount(27);
  await page.locator('path.uf[data-uf="AM"]').click();
  await expect(page.getByLabel('Escolher estado')).toHaveValue('AM');
  await expect(page.locator('.acao', { hasText: 'Mutirão' }), 'sarampo não tem mosquito').toHaveCount(0);
});

test('o relógio anda, e a partida salva pode ser retomada', async ({ page }) => {
  await comecar(page, 'Pandemia respiratória');
  await page.getByRole('button', { name: 'Quatro vezes mais rápido' }).click();
  await expect(page.locator('.relogio')).toContainText(/dia [3-9] de 540/, { timeout: 10_000 });
  await page.getByRole('button', { name: 'Pausar' }).click();
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.locator('.continuar')).toContainText('Pandemia respiratória');
  await page.reload();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.locator('.relogio')).toContainText(/dia [3-9] de 540/);
});

test('depois da primeira visita o jogo abre sem internet', async ({ page, context }) => {
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await page.reload(); // esta carga já passa pelo service worker e enche o cache
  await expect(page.getByRole('heading', { name: 'Linha de Frente: SUS' })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Linha de Frente: SUS' })).toBeVisible();
  await page.getByRole('button', { name: 'Jogar Dengue' }).click();
  await expect(page.getByRole('button', { name: 'Começar' })).toBeVisible();
  await context.setOffline(false);
  erros.length = 0; // sem rede o navegador registra a falha da busca; aqui isso é esperado
});

test('a página Sobre lista as fontes oficiais e não rola para o lado', async ({ page }) => {
  await page.getByRole('button', { name: 'Sobre o jogo e as fontes' }).click();
  const fontes = page.locator('.fontes a');
  expect(await fontes.count()).toBeGreaterThanOrEqual(6);
  for (const href of await fontes.evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href))) {
    expect(new URL(href).hostname).toMatch(/gov\.br$/);
  }
  const sobra = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sobra).toBeLessThanOrEqual(0);
});
