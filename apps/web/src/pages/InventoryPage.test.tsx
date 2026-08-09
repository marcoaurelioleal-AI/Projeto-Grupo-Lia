import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { InventoryPage } from './InventoryPage';

vi.mock('../contexts/useAuth', () => ({ useAuth: vi.fn() }));
vi.mock('../api/client', () => ({
  api: {
    inventoryUnits: vi.fn(),
    products: vi.fn(),
    inventory: vi.fn(),
    inventoryMovements: vi.fn(),
    createInventoryMovement: vi.fn(),
    adjustInventory: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    createInventoryBalance: vi.fn(),
    updateInventoryCost: vi.fn()
  }
}));

const mockedUseAuth = vi.mocked(useAuth);
const mockedApi = vi.mocked(api);

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter><InventoryPage /></MemoryRouter>
    </QueryClientProvider>
  );
}

describe('InventoryPage access experience', () => {
  beforeEach(() => {
    mockedApi.inventoryUnits.mockResolvedValue([]);
    mockedApi.products.mockResolvedValue([]);
    mockedApi.inventoryMovements.mockResolvedValue([]);
    mockedApi.inventory.mockResolvedValue([{
      id: 1,
      store_id: 4,
      store: 'Fábrica Lia',
      product_id: 1,
      product_name: 'Hambúrguer 160g',
      unit: 'unidade',
      quantity: 12,
      created_by: 'Gestor',
      created_at: '2026-08-08T10:00:00',
      updated_at: '2026-08-08T10:00:00'
    }]);
  });

  it('keeps an operation user fixed to their own unit and hides catalog controls', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 10, username: 'operacao', name: 'Operação', role: 'operacao', store_id: 4, store_name: 'Fábrica Lia', active: true },
      loading: false,
      login: vi.fn(),
      logout: vi.fn()
    });

    renderPage();

    expect(await screen.findByText(/Unidade da conta: Fábrica Lia/i)).toBeTruthy();
    expect(screen.queryByText(/Catálogo global/i)).toBeNull();
    await waitFor(() => expect(mockedApi.inventory).toHaveBeenCalledWith({ storeId: 4 }));
  });

  it('shows global unit filtering and management controls to leadership', async () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 11, username: 'lider', name: 'Liderança', role: 'lideranca', store_id: null, store_name: null, active: true },
      loading: false,
      login: vi.fn(),
      logout: vi.fn()
    });

    renderPage();

    expect(await screen.findByLabelText(/Unidade consultada/i)).toBeTruthy();
    expect(screen.getByText(/Catálogo global/i)).toBeTruthy();
  });
});
