import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';

vi.mock('@/lib/api', () => ({
  api: {
    auth: {
      me: vi.fn(),
      logout: vi.fn(),
    },
  },
}));

function TestConsumer() {
  const { user, loading, login } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user?.email ?? 'none'}</span>
      <button onClick={login}>Login</button>
    </div>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.auth.me).mockRejectedValue(new Error('Unauthorized'));
  });

  it('shows loading state initially', () => {
    vi.mocked(api.auth.me).mockImplementation(
      () => new Promise(() => {}) // never resolves
    );
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    expect(screen.getByTestId('loading')).toHaveTextContent('true');
  });

  it('sets loading false and user null after failed me()', async () => {
    vi.mocked(api.auth.me).mockRejectedValue(new Error('401'));
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('sets user when me() returns user', async () => {
    vi.mocked(api.auth.me).mockResolvedValue({
      user: {
        id: '1',
        email: 'test@example.com',
        role: 'Admin',
        workspaceId: 'w1',
        workspace: { id: 'w1', name: 'Workspace' },
      },
    });
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  it('login redirects to Google OAuth', async () => {
    let href = '';
    Object.defineProperty(window, 'location', {
      value: {
        get href() {
          return href;
        },
        set href(v: string) {
          href = v;
        },
      },
      configurable: true,
    });
    vi.mocked(api.auth.me).mockRejectedValue(new Error('401'));
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('false');
    });
    screen.getByRole('button', { name: 'Login' }).click();
    expect(href).toBe('/api/v1/auth/google');
  });
});
