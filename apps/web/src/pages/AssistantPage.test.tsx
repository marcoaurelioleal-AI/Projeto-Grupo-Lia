import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '../api/client';
import { useAuth } from '../contexts/useAuth';
import { AssistantPage } from './AssistantPage';

vi.mock('../api/client', () => ({
  api: {
    manuals: vi.fn(),
    aiHistory: vi.fn(),
    chat: vi.fn(),
    submitAiFeedback: vi.fn()
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
      <AssistantPage />
    </QueryClientProvider>
  );
}

describe('AssistantPage', () => {
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
    mockedApi.manuals.mockResolvedValue([]);
    mockedApi.aiHistory.mockResolvedValue([]);
  });

  it('does not show provider diagnostics in the customer experience', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: /Lia pronta para orientar o turno/i })).toBeInTheDocument();
    expect(screen.queryByText(/Diagnostico IA/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Tamanho da chave/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Fingerprint/i)).not.toBeInTheDocument();
  });

  it('shows a friendly message when the assistant is unavailable', async () => {
    mockedApi.chat.mockRejectedValue(new Error('GEMINI_API_KEY invalid: provider timeout'));
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/Digite uma duvida operacional/i), {
      target: { value: 'Como abrir a loja?' }
    });
    fireEvent.click(screen.getByRole('button', { name: /Enviar pergunta para a Lia/i }));

    await waitFor(() => {
      expect(screen.getByText(/A Lia está temporariamente indisponível/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/GEMINI_API_KEY invalid/i)).not.toBeInTheDocument();
  });
});
