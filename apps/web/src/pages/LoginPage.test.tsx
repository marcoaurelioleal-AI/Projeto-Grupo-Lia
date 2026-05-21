import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '../contexts/useAuth';
import { LoginPage } from './LoginPage';

vi.mock('../contexts/useAuth', () => ({
  useAuth: vi.fn()
}));

const mockedUseAuth = vi.mocked(useAuth);

describe('LoginPage', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login: vi.fn(),
      logout: vi.fn()
    });
  });

  it('renders the internal access form', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: /Entrar na Central LIA/i })).toBeTruthy();
    expect(screen.getByLabelText(/Senha/i)).toBeTruthy();
    expect(screen.getByRole('link', { name: /lideranca/i })).toBeTruthy();
  });

  it('submits credentials through the auth context', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    mockedUseAuth.mockReturnValue({
      user: null,
      loading: false,
      login,
      logout: vi.fn()
    });

    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/Senha/i), { target: { value: 'admin123' } });
    fireEvent.click(screen.getByRole('button', { name: /^Entrar$/i }));

    await waitFor(() => expect(login).toHaveBeenCalledWith('admin', 'admin123'));
  });
});
