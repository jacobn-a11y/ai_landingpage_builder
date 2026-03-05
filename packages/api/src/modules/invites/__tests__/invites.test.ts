import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findFirst: vi.fn() },
    invite: { create: vi.fn() },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

describe('Invites POST /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.invite.create.mockResolvedValue({
      id: 'invite-1',
      email: 'new@example.com',
      role: 'Editor',
      token: 'token-123',
      expiresAt: new Date(),
    });
  });

  it('returns 403 for non-Admin', async () => {
    await request(app)
      .post('/api/v1/invites')
      .set('X-Test-Auth', '1')
      .set('X-Test-Role', 'Editor')
      .send({ email: 'new@example.com', role: 'Editor' })
      .expect(403)
      .expect((res) => {
        expect(res.body).toMatchObject({ error: 'Insufficient permissions' });
      });
  });

  it('creates invite when Admin', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/invites')
      .set('X-Test-Auth', '1')
      .send({ email: 'new@example.com', role: 'Editor' })
      .expect(201);

    expect(res.body).toMatchObject({
      email: 'new@example.com',
      role: 'Editor',
    });
    expect(res.body.acceptUrl).toMatch(/^https?:\/\/.+\/accept-invite\?token=.+$/);
    expect(mockPrisma.invite.create).toHaveBeenCalled();
  });
});
