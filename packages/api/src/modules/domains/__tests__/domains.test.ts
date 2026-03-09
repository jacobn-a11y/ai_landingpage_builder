import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    domain: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

vi.mock('../domains.verification.js', () => ({
  getCnameTarget: vi.fn().mockReturnValue('cname.replicapages.io'),
  verifyDomain: vi.fn().mockResolvedValue({
    success: true,
    txtOk: true,
    cnameOk: true,
    hasConflictingA: false,
  }),
}));

describe('Domains', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/domains', () => {
    it('creates domain with hostname', async () => {
      mockPrisma.domain.create.mockResolvedValue({
        id: 'dom-1',
        workspaceId: 'test-workspace-id',
        hostname: 'landing.example.com',
        status: 'Draft',
        verificationTxt: 'rp-abc123',
        cnameTarget: 'cname.replicapages.io',
      });

      const res = await request(app)
        .post('/api/v1/domains')
        .set('X-Test-Auth', '1')
        .send({ hostname: 'landing.example.com' })
        .expect(201);

      expect(res.body.domain).toMatchObject({
        hostname: 'landing.example.com',
        status: 'Draft',
      });
      expect(mockPrisma.domain.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workspaceId: 'test-workspace-id',
          hostname: 'landing.example.com',
          status: 'Draft',
        }),
      });
    });

    it('returns 400 when hostname is missing', async () => {
      await request(app)
        .post('/api/v1/domains')
        .set('X-Test-Auth', '1')
        .send({})
        .expect(400);
    });

    it('returns 401 when unauthenticated', async () => {
      await request(app)
        .post('/api/v1/domains')
        .send({ hostname: 'landing.example.com' })
        .expect(401);
    });
  });

  describe('GET /api/v1/domains', () => {
    it('returns domains for workspace', async () => {
      mockPrisma.domain.findMany.mockResolvedValue([
        { id: 'dom-1', hostname: 'landing.example.com', status: 'Active' },
      ]);

      const res = await request(app)
        .get('/api/v1/domains')
        .set('X-Test-Auth', '1')
        .expect(200);

      expect(res.body.domains).toHaveLength(1);
      expect(res.body.domains[0]).toMatchObject({
        hostname: 'landing.example.com',
        status: 'Active',
      });
    });
  });

  describe('GET /api/v1/domains/:id', () => {
    it('returns single domain', async () => {
      mockPrisma.domain.findFirst.mockResolvedValue({
        id: 'dom-1',
        hostname: 'landing.example.com',
        status: 'Active',
      });

      const res = await request(app)
        .get('/api/v1/domains/dom-1')
        .set('X-Test-Auth', '1')
        .expect(200);

      expect(res.body.domain).toMatchObject({
        id: 'dom-1',
        hostname: 'landing.example.com',
      });
    });

    it('returns 404 when domain not found', async () => {
      mockPrisma.domain.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/v1/domains/nonexistent')
        .set('X-Test-Auth', '1')
        .expect(404);
    });
  });
});
