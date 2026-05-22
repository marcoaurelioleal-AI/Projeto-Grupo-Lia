import { expect, test } from '@playwright/test';

test('login flow reaches the daily dashboard', async ({ page }) => {
  let loggedIn = false;

  await page.route('**/api/auth/me', async (route) => {
    if (!loggedIn) {
      await route.fulfill({ status: 401, json: { detail: 'Token ausente' } });
      return;
    }
    await route.fulfill({
      json: {
        id: 1,
        username: 'operacao',
        name: 'Operacao LIA',
        role: 'operacao',
        store_id: 1,
        store_name: 'Lia Burguer',
        active: true
      }
    });
  });

  await page.route('**/api/auth/login', async (route) => {
    loggedIn = true;
    await route.fulfill({
      json: {
        access_token: 'fake-token',
        token_type: 'bearer',
        user: {
          id: 1,
          username: 'operacao',
          name: 'Operacao LIA',
          role: 'operacao',
          store_id: 1,
          store_name: 'Lia Burguer',
          active: true
        }
      }
    });
  });

  await page.route('**/api/checklists**', async (route) => {
    await route.fulfill({
      status: 200,
      json: []
    });
  });

  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Entrar na Central LIA/i })).toBeVisible();

  await page.getByLabel(/Senha/i).fill('admin123');
  await page.getByRole('button', { name: /^Entrar$/i }).click();

  await expect(page).toHaveURL('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: /Checklists de hoje/i })).toBeVisible();
  await expect(page.getByText(/Tarefas pendentes/i)).toBeVisible();
});
