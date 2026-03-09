import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: { findFirst: vi.fn() },
    invite: { create: vi.fn(), findFirst: vi.fn() },
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

describe('Invites POST /accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/v1/invites/accept')
      .send({})
      .expect(400);

    expect(res.body).toMatchObject({ error: 'Missing invite token' });
  });

  it('returns 400 when invite is not found', async () => {
    mockPrisma.invite.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/invites/accept')
      .send({ token: 'invalid-token' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'Invalid invite' });
  });

  it('returns 400 when invite is expired', async () => {
    const expiredDate = new Date();
    expiredDate.setDate(expiredDate.getDate() - 1);
    mockPrisma.invite.findFirst.mockResolvedValue({
      id: 'invite-1',
      token: 'expired-token',
      workspaceId: 'ws-1',
      role: 'Editor',
      email: 'user@example.com',
      expiresAt: expiredDate,
      workspace: { id: 'ws-1', name: 'Test' },
    });

    const res = await request(app)
      .post('/api/v1/invites/accept')
      .send({ token: 'expired-token' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'Invite expired' });
  });

  it('returns 200 with redirectUrl on valid invite', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    mockPrisma.invite.findFirst.mockResolvedValue({
      id: 'invite-1',
      token: 'valid-token',
      workspaceId: 'ws-1',
      role: 'Editor',
      email: 'user@example.com',
      expiresAt: futureDate,
      workspace: { id: 'ws-1', name: 'Test' },
    });

    const res = await request(app)
      .post('/api/v1/invites/accept')
      .send({ token: 'valid-token' })
      .expect(200);

    expect(res.body).toHaveProperty('redirectUrl');
    expect(res.body.redirectUrl).toMatch(/\/api\/v1\/auth\/google$/);
  });

  it('GET /accept returns 404 (route removed)', async () => {
    await request(app)
      .get('/api/v1/invites/accept?token=some-token')
      .expect(404);
  });
});
