import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    page: { findFirst: vi.fn() },
    submission: { create: vi.fn() },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

// Mock delivery to avoid side effects
vi.mock('../submissions.delivery.js', () => ({
  queueZapierDelivery: vi.fn().mockResolvedValue(undefined),
}));

describe('Submissions POST /api/v1/submissions', () => {
  const publishedPage = {
    id: 'page-1',
    workspaceId: 'ws-1',
    name: 'Test Page',
    slug: 'test-page',
    lastPublishedContentJson: { blocks: {} },
    publishConfig: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.page.findFirst.mockResolvedValue(publishedPage);
    mockPrisma.submission.create.mockResolvedValue({
      id: 'sub-1',
      workspaceId: 'ws-1',
      pageId: 'page-1',
      payloadJson: {},
      deliveryStatus: 'pending',
    });
  });

  it('creates submission when payload is valid', async () => {
    const res = await request(app)
      .post('/api/v1/submissions')
      .send({
        page_id: 'page-1',
        email: 'test@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
      })
      .expect(200);

    expect(res.body).toEqual({ success: true });
    expect(mockPrisma.submission.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: 'ws-1',
        pageId: 'page-1',
        deliveryStatus: 'pending',
        payloadJson: expect.objectContaining({
          email: 'test@example.com',
          first_name: 'Jane',
          last_name: 'Doe',
          page_id: 'page-1',
          page_name: 'Test Page',
          page_slug: 'test-page',
          utm_page: 'Test Page',
        }),
      }),
    });
  });

  it('returns 400 when page_id is missing', async () => {
    const res = await request(app)
      .post('/api/v1/submissions')
      .send({ email: 'test@example.com' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'page_id is required' });
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/v1/submissions')
      .send({ page_id: 'page-1' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'email is required' });
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it('returns 400 when page is not found', async () => {
    mockPrisma.page.findFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/submissions')
      .send({ page_id: 'nonexistent', email: 'test@example.com' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'Page not found' });
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it('returns 400 when page is not published', async () => {
    mockPrisma.page.findFirst.mockResolvedValue({
      ...publishedPage,
      lastPublishedContentJson: null,
    });

    const res = await request(app)
      .post('/api/v1/submissions')
      .send({ page_id: 'page-1', email: 'test@example.com' })
      .expect(400);

    expect(res.body).toMatchObject({ error: 'Page is not published' });
    expect(mockPrisma.submission.create).not.toHaveBeenCalled();
  });

  it('returns 429 when rate limit exceeded (10 req/min)', async () => {
    // Send 11 requests rapidly - 11th should be rate limited
    const requests = Array.from({ length: 11 }, () =>
      request(app)
        .post('/api/v1/submissions')
        .send({ page_id: 'page-1', email: 'test@example.com' })
    );

    const results = await Promise.all(requests);
    const rateLimited = results.filter((r) => r.status === 429);
    expect(rateLimited.length).toBeGreaterThanOrEqual(1);
    if (rateLimited[0]) {
      expect(rateLimited[0].body).toMatchObject({
        error: 'Too many submissions. Please try again later.',
      });
    }
  });
});
