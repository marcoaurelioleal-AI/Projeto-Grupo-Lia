import { expect, test } from '@playwright/test';

type TestUser = {
  id: number;
  username: string;
  name: string;
  role: 'operacao' | 'lideranca';
  store_id: number | null;
  store_name: string | null;
  active: boolean;
};

test('Fábrica produz, envia, Burger recebe e perde, liderança consulta o valor', async ({ page }) => {
  const factory: TestUser = { id: 10, username: 'fabrica', name: 'Operação Fábrica', role: 'operacao', store_id: 4, store_name: 'Fábrica Lia', active: true };
  const burger: TestUser = { id: 11, username: 'burger', name: 'Operação Burger', role: 'operacao', store_id: 2, store_name: 'Lia Burger', active: true };
  const leadership: TestUser = { id: 12, username: 'lider', name: 'Liderança', role: 'lideranca', store_id: null, store_name: null, active: true };
  let currentUser = factory;
  let nextMovementId = 1;
  let factoryQuantity = 10;
  let burgerQuantity = 0;
  let transfer: Record<string, unknown> | null = null;
  const wasteRecords: Array<Record<string, unknown>> = [];

  const units = [
    { id: 2, name: 'Lia Burger', unit_type: 'loja', active: true },
    { id: 4, name: 'Fábrica Lia', unit_type: 'fabrica', active: true }
  ];
  const product = { id: 1, name: 'Hambúrguer piloto', unit: 'unidade', active: true };

  const balance = (storeId: number, quantity: number) => ({
    id: storeId === 4 ? 1 : 2,
    store_id: storeId,
    store: storeId === 4 ? 'Fábrica Lia' : 'Lia Burger',
    product_id: 1,
    product_name: product.name,
    unit: product.unit,
    quantity,
    created_by: 'Gestor',
    created_at: '2026-08-08T10:00:00',
    updated_at: '2026-08-08T10:00:00'
  });

  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path === '/api/auth/me') return route.fulfill({ json: currentUser });
    if (path === '/api/inventory/units') return route.fulfill({ json: units });
    if (path === '/api/inventory/products') return route.fulfill({ json: [product] });
    if (path === '/api/inventory' && method === 'GET') {
      const items = currentUser.role === 'lideranca'
        ? [balance(4, factoryQuantity), balance(2, burgerQuantity)]
        : currentUser.store_id === 4
          ? [balance(4, factoryQuantity)]
          : burgerQuantity > 0 ? [balance(2, burgerQuantity)] : [];
      return route.fulfill({ json: items });
    }
    if (/\/api\/inventory\/\d+\/movements$/.test(path) && method === 'POST') {
      const body = request.postDataJSON() as { movement_type: string; quantity: number; reason: string };
      const before = currentUser.store_id === 4 ? factoryQuantity : burgerQuantity;
      const delta = body.movement_type === 'saida' ? -body.quantity : body.quantity;
      if (currentUser.store_id === 4) factoryQuantity += delta;
      else burgerQuantity += delta;
      return route.fulfill({ json: { id: nextMovementId++, inventory_item_id: currentUser.store_id === 4 ? 1 : 2, movement_type: body.movement_type, quantity_delta: delta, quantity_before: before, quantity_after: before + delta, reason: body.reason, notes: null, created_by: currentUser.name, created_at: new Date().toISOString() } });
    }
    if (/\/api\/inventory\/\d+\/movements$/.test(path) && method === 'GET') return route.fulfill({ json: [] });
    if (path === '/api/transfers' && method === 'POST') {
      const body = request.postDataJSON() as { destination_store_id: number; items: Array<{ quantity: number }> };
      factoryQuantity -= body.items[0].quantity;
      transfer = { id: 1, source_store_id: 4, source_store: 'Fábrica Lia', destination_store_id: body.destination_store_id, destination_store: 'Lia Burger', status: 'enviada', notes: null, discrepancy_note: null, sent_by: factory.name, received_by: null, sent_at: new Date().toISOString(), received_at: null, items: [{ id: 1, product_id: 1, product_name: product.name, unit: product.unit, quantity_sent: body.items[0].quantity, quantity_received: null }] };
      return route.fulfill({ json: transfer });
    }
    if (path === '/api/transfers' && method === 'GET') return route.fulfill({ json: transfer ? [transfer] : [] });
    if (path === '/api/transfers/1/receive' && method === 'POST') {
      const body = request.postDataJSON() as { items: Array<{ quantity_received: number }> };
      burgerQuantity += body.items[0].quantity_received;
      transfer = { ...transfer!, status: 'recebida', received_by: burger.name, received_at: new Date().toISOString(), items: [{ ...(transfer!.items as Array<Record<string, unknown>>)[0], quantity_received: body.items[0].quantity_received }] };
      return route.fulfill({ json: transfer });
    }
    if (path === '/api/waste' && method === 'POST') {
      const body = request.postDataJSON() as { quantity: number; reason: string; notes?: string };
      burgerQuantity -= body.quantity;
      const record = { id: 1, inventory_item_id: 2, store_id: 2, store: 'Lia Burger', product_id: 1, product_name: product.name, unit: product.unit, quantity: body.quantity, reason: body.reason, notes: body.notes ?? null, created_by: burger.name, created_at: new Date().toISOString(), total_cost: 5 };
      wasteRecords.push(record);
      return route.fulfill({ json: record });
    }
    if (path === '/api/waste' && method === 'GET') {
      return route.fulfill({ json: wasteRecords.map((record) => currentUser.role === 'lideranca' ? record : Object.fromEntries(Object.entries(record).filter(([key]) => key !== 'total_cost'))) });
    }
    if (path === '/api/waste/summary') {
      const payload: Record<string, unknown> = { total_quantity: wasteRecords.reduce((sum, record) => sum + Number(record.quantity), 0), record_count: wasteRecords.length, by_reason: { erro_preparo: 2 } };
      if (currentUser.role === 'lideranca') payload.total_cost = 5;
      return route.fulfill({ json: payload });
    }
    return route.fulfill({ status: 200, json: [] });
  });

  await page.goto('/inventory');
  await page.getByRole('button', { name: /Hambúrguer piloto/ }).click();
  await page.getByLabel('Tipo de movimentação').selectOption('producao');
  await page.getByLabel('Quantidade movimentada').fill('2');
  await page.getByLabel('Motivo da movimentação').fill('Produção do turno');
  await page.getByRole('button', { name: 'Registrar entrada' }).click();
  await expect(page.getByRole('button', { name: /12 unidade/ })).toBeVisible();

  await page.goto('/transfers');
  await page.getByLabel('Unidade de destino').selectOption('2');
  await page.getByLabel('Produto transferido').selectOption('1');
  await page.getByLabel('Quantidade enviada').fill('6');
  await page.getByRole('button', { name: /^Enviar/ }).click();
  await expect(page.getByText('Pendente')).toBeVisible();

  currentUser = burger;
  await page.goto('/transfers');
  await page.getByRole('button', { name: 'Conferir recebimento' }).click();
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByText('Recebida', { exact: true })).toBeVisible();

  await page.goto('/inventory');
  await page.getByRole('button', { name: /Hambúrguer piloto/ }).click();
  await page.getByLabel('Tipo de movimentação').selectOption('saida');
  await page.getByLabel('Quantidade movimentada').fill('1');
  await page.getByLabel('Motivo da movimentação').fill('Consumo operacional');
  await page.getByRole('button', { name: 'Registrar saída' }).click();

  await page.goto('/waste');
  await page.getByLabel('Produto perdido').selectOption('2');
  await page.getByLabel('Quantidade perdida').fill('2');
  await page.getByRole('button', { name: 'Confirmar perda' }).click();
  await expect(page.getByText(/-2 unidade/)).toBeVisible();

  currentUser = leadership;
  await page.goto('/waste');
  await expect(page.getByText('R$ 5,00', { exact: true })).toBeVisible();
  await expect(page.getByText(/Operação Burger/)).toBeVisible();
});
