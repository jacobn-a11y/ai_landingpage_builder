import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    workspace: { findUnique: vi.fn() },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

describe('Workspace GET /', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.workspace.findUnique.mockResolvedValue({
      id: 'test-workspace-id',
      name: 'Test Workspace',
      allowedEmailDomains: [],
      globalHeaderScript: null,
      globalFooterScript: null,
      scriptAllowlist: [],
    });
  });

  it('returns 401 when unauthenticated', async () => {
    await request(app)
      .get('/api/v1/workspaces')
      .expect(401)
      .expect((res) => {
        expect(res.body).toMatchObject({ error: 'Authentication required' });
      });
  });

  it('returns workspace for authenticated user', async () => {
    const res = await request(app)
      .get('/api/v1/workspaces')
      .set('X-Test-Auth', '1')
      .expect(200);

    expect(res.body.workspace).toMatchObject({
      id: 'test-workspace-id',
      name: 'Test Workspace',
      allowedEmailDomains: [],
    });
    expect(mockPrisma.workspace.findUnique).toHaveBeenCalledWith({
      where: { id: 'test-workspace-id' },
      select: {
        id: true,
        name: true,
        allowedEmailDomains: true,
        globalHeaderScript: true,
        globalFooterScript: true,
        scriptAllowlist: true,
      },
    });
  });
});
