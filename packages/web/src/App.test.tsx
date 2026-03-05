import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import App from './App';

vi.mock('@/lib/api', () => ({
  api: { auth: { me: vi.fn().mockRejectedValue(new Error('401')) } },
}));

describe('App', () => {
  it('renders without crashing', async () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(document.body).toBeInTheDocument();
    });
  });
});
