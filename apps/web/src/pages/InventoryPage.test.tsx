import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../contexts/useAuth';
import { InventoryPage } from './InventoryPage';

const apiMocks = vi.hoisted(() => ({
  inventory: vi.fn(),
  createInventoryItem: vi.fn(),
  updateInventoryItem: vi.fn(),
  deleteInventoryItem: vi.fn()
}));

vi.mock('../api/client', () => ({ api: apiMocks }));
vi.mock('../contexts/useAuth', () => ({ useAuth: vi.fn() }));

const mockedUseAuth = vi.mocked(useAuth);
const inventoryItem = {
  id: 42,
  store: 'Lia Burger',
  product_name: 'Queijo prato',
  quantity: 12,
  created_by: 'Administrador LIA',
  created_at: '2026-08-06T18:00:00',
  updated_at: '2026-08-06T18:00:00'
};

function renderInventoryPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <InventoryPage />
    </QueryClientProvider>
  );
}

describe('InventoryPage', () => {
  beforeEach(() => {
    apiMocks.inventory.mockResolvedValue([inventoryItem]);
    apiMocks.deleteInventoryItem.mockResolvedValue(inventoryItem);
    mockedUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'admin',
        name: 'Administrador LIA',
        role: 'admin',
        store_id: null,
        store_name: null,
        active: true
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn()
    });
  });

  it('shows inventory timestamps in the Sao Paulo time zone', async () => {
    renderInventoryPage();

    expect(await screen.findByText(/Atualizado em 06\/08\/2026, 15:00/)).toBeVisible();
  });

  it('requires confirmation before deleting a product', async () => {
    renderInventoryPage();

    fireEvent.click(await screen.findByRole('button', { name: /Excluir Queijo prato/i }));
    expect(apiMocks.deleteInventoryItem).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Confirmar exclusão/i }));

    await waitFor(() => expect(apiMocks.deleteInventoryItem.mock.calls[0]?.[0]).toBe(42));
  });
});
