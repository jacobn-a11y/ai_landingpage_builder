import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

vi.mock('../../../shared/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'test-user-id',
        email: 'test@example.com',
        role: 'Admin',
        workspaceId: 'test-workspace-id',
        workspace: { id: 'test-workspace-id', name: 'Test Workspace' },
      }),
    },
  },
}));

describe('Auth /me', () => {
  it('returns 401 when unauthenticated', async () => {
    await request(app)
      .get('/api/v1/auth/me')
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({ error: 'Authentication required' });
      });
  });

  it('returns 200 with user when authenticated', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('X-Test-Auth', '1')
      .expect(200);

    expect(res.body.user).toMatchObject({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'Admin',
      workspaceId: 'test-workspace-id',
      workspace: { id: 'test-workspace-id', name: 'Test Workspace' },
    });
  });
});
