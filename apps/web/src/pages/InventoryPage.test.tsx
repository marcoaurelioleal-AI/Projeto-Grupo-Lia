import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { InventoryPage } from './InventoryPage';

vi.mock('../api/client', () => ({
  api: {
    inventory: vi.fn(),
    createInventoryItem: vi.fn(),
    updateInventoryItem: vi.fn(),
    deleteInventoryItem: vi.fn()
  }
}));

vi.mock('../contexts/useAuth', () => ({
  useAuth: vi.fn()
}));

const mockedApi = vi.mocked(api);
const mockedUseAuth = vi.mocked(useAuth);

function renderPage() {
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
    mockedUseAuth.mockReturnValue({
      user: {
        id: 1,
        username: 'admin',
        name: 'Administrador',
        role: 'admin',
        store_id: null,
        store_name: null,
        active: true
      },
      loading: false,
      login: vi.fn(),
      logout: vi.fn()
    });
    mockedApi.inventory.mockResolvedValue([]);
    mockedApi.createInventoryItem.mockResolvedValue({
      id: 1,
      store: 'Lia Burger',
      product_name: 'Farinha de trigo',
      quantity: 1.5,
      unit: 'kg',
      created_by: 'Administrador',
      created_at: '2026-08-14T12:00:00',
      updated_at: '2026-08-14T12:00:00'
    });
    mockedApi.deleteInventoryItem.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sends the selected measurement unit with a fractional quantity', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText(/^Produto/i), {
      target: { value: 'Farinha de trigo' }
    });
    fireEvent.change(screen.getByLabelText(/^Quantidade/i), {
      target: { value: '1.5' }
    });
    fireEvent.change(screen.getByLabelText(/Unidade de medida/i), {
      target: { value: 'kg' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Salvar produto/i }));

    await waitFor(() => {
      expect(mockedApi.createInventoryItem).toHaveBeenCalledWith({
        store: 'Lia Burger',
        product_name: 'Farinha de trigo',
        quantity: 1.5,
        unit: 'kg'
      }, expect.anything());
    });
  });

  it('does not delete the product when confirmation is canceled', async () => {
    mockedApi.inventory.mockResolvedValue([
      {
        id: 7,
        store: 'Lia Burger',
        product_name: 'Farinha de trigo',
        quantity: 1.5,
        unit: 'kg',
        created_by: 'Administrador',
        created_at: '2026-08-14T12:00:00',
        updated_at: '2026-08-14T12:00:00'
      }
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Excluir Farinha de trigo/i }));

    expect(mockedApi.deleteInventoryItem).not.toHaveBeenCalled();
  });

  it('deletes the product after confirmation', async () => {
    mockedApi.inventory.mockResolvedValue([
      {
        id: 7,
        store: 'Lia Burger',
        product_name: 'Farinha de trigo',
        quantity: 1.5,
        unit: 'kg',
        created_by: 'Administrador',
        created_at: '2026-08-14T12:00:00',
        updated_at: '2026-08-14T12:00:00'
      }
    ]);
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: /Excluir Farinha de trigo/i }));

    await waitFor(() => {
      expect(mockedApi.deleteInventoryItem).toHaveBeenCalledWith(7, expect.anything());
    });
  });
});
