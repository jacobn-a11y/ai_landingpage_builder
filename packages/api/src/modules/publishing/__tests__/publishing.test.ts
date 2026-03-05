import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    page: { findFirst: vi.fn(), update: vi.fn() },
    domain: { findFirst: vi.fn() },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

describe('Publishing', () => {
  const publishedPage = {
    id: 'page-1',
    workspaceId: 'test-workspace-id',
    slug: 'test-page',
    contentJson: { blocks: {} },
    publishConfig: {
      targetType: 'demo',
      path: '/test-page',
      status: 'published',
      isPublished: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.page.findFirst.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === 'page-1') {
        return Promise.resolve(publishedPage);
      }
      return Promise.resolve(null);
    });
    mockPrisma.page.update.mockResolvedValue({ ...publishedPage });
  });

  describe('POST /api/v1/pages/:id/publish', () => {
    it('publishes page to demo target', async () => {
      const res = await request(app)
        .post('/api/v1/pages/page-1/publish')
        .set('X-Test-Auth', '1')
        .send({ targetType: 'demo', path: '/test-page' })
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.publishStatus).toBeDefined();
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: expect.objectContaining({
          publishConfig: expect.objectContaining({
            targetType: 'demo',
            status: 'published',
            isPublished: true,
          }),
        }),
      });
    });

    it('returns 400 when targetType is invalid', async () => {
      await request(app)
        .post('/api/v1/pages/page-1/publish')
        .set('X-Test-Auth', '1')
        .send({ targetType: 'invalid' })
        .expect(400);
    });

    it('returns 400 when page not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await request(app)
        .post('/api/v1/pages/nonexistent/publish')
        .set('X-Test-Auth', '1')
        .send({ targetType: 'demo' })
        .expect(400);
    });
  });

  describe('POST /api/v1/pages/:id/unpublish', () => {
    it('unpublishes page', async () => {
      const res = await request(app)
        .post('/api/v1/pages/page-1/unpublish')
        .set('X-Test-Auth', '1')
        .send({})
        .expect(200);

      expect(res.body.ok).toBe(true);
      expect(res.body.publishStatus).toBeDefined();
      expect(mockPrisma.page.update).toHaveBeenCalledWith({
        where: { id: 'page-1' },
        data: expect.objectContaining({
          publishConfig: expect.objectContaining({
            status: 'draft',
            isPublished: false,
          }),
          lastPublishedContentJson: expect.anything(),
        }),
      });
    });

    it('returns 400 when page not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await request(app)
        .post('/api/v1/pages/nonexistent/unpublish')
        .set('X-Test-Auth', '1')
        .send({})
        .expect(400);
    });
  });

  describe('GET /api/v1/pages/:id/publish-status', () => {
    it('returns publish status', async () => {
      const res = await request(app)
        .get('/api/v1/pages/page-1/publish-status')
        .set('X-Test-Auth', '1')
        .expect(200);

      expect(res.body.publishStatus).toBeDefined();
      expect(res.body.publishStatus.status).toBeDefined();
      expect(res.body.publishStatus.targetLabel).toBeDefined();
    });

    it('returns 404 when page not found', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await request(app)
        .get('/api/v1/pages/nonexistent/publish-status')
        .set('X-Test-Auth', '1')
        .expect(404);
    });
  });
});
