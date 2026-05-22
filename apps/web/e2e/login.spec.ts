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
        username: 'admin',
        name: 'Administrador LIA',
        role: 'admin',
        store_id: null,
        store_name: null,
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
          username: 'admin',
          name: 'Administrador LIA',
          role: 'admin',
          store_id: null,
          store_name: null,
          active: true
        }
      }
    });
  });

  await page.route('**/api/reports/executive', async (route) => {
    await route.fulfill({
      json: {
        today: '2026-05-19',
        visible_stores: ['Lia Burguer'],
        summary_7d: summary('2026-05-13', '2026-05-19'),
        summary_30d: summary('2026-04-20', '2026-05-19'),
        store_rankings: [
          {
            store: 'Lia Burguer',
            total_checklists: 3,
            total_items: 30,
            completed_items: 24,
            pending_tasks: 6,
            completion_percent: 80
          }
        ],
        critical_incidents: [],
        recent_evidences: []
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
  await expect(page.getByText(/Operacao em poucos segundos/i)).toBeVisible();
  await expect(page.getByText(/Lojas com mais pendencias/i)).toBeVisible();
  await expect(page.getByText(/Lia Burguer/i)).toBeVisible();
});

function summary(startDate: string, endDate: string) {
  return {
    start_date: startDate,
    end_date: endDate,
    store: null,
    total_checklists: 3,
    total_items: 30,
    completed_items: 24,
    completion_percent: 80,
    pending_tasks: 6,
    total_incidents: 0,
    incidents_by_status: {},
    incidents_by_severity: {},
    incidents_by_category: {},
    evidences_uploaded: 0
  };
}
