import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    page: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    pageFormBinding: { deleteMany: vi.fn(), create: vi.fn() },
  },
}));

vi.mock('../../../shared/db.js', () => ({ prisma: mockPrisma }));

describe('Pages POST /api/v1/pages/:id/clone', () => {
  const sourcePage = {
    id: 'page-1',
    workspaceId: 'test-workspace-id',
    name: 'Original Page',
    slug: 'original-page',
    folderId: null,
    contentJson: { blocks: { b1: { type: 'section' } } },
    lastPublishedContentJson: null,
    scripts: { header: '// script' },
    publishConfig: {},
    scheduleConfig: {},
    formBindings: [
      {
        id: 'b1',
        pageId: 'page-1',
        formId: 'form-1',
        blockId: null,
        type: 'hooked',
        selector: 'form#contact',
        fieldMappings: { email: 'email', first_name: 'fname' },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.page.findFirst.mockResolvedValue(sourcePage);
    mockPrisma.page.findMany.mockResolvedValue([{ slug: 'original-page' }]);
    mockPrisma.page.create.mockResolvedValue({
      id: 'page-2',
      workspaceId: 'test-workspace-id',
      name: 'Original Page (Copy)',
      slug: 'original-page-copy',
      formBindings: [],
    });
    mockPrisma.pageFormBinding.create.mockResolvedValue({});
    mockPrisma.page.findUnique.mockResolvedValue({
      id: 'page-2',
      workspaceId: 'test-workspace-id',
      name: 'Original Page (Copy)',
      slug: 'original-page-copy',
      formBindings: [
        {
          formId: 'form-1',
          type: 'hooked',
          selector: 'form#contact',
          fieldMappings: { email: 'email', first_name: 'fname' },
        },
      ],
    });
  });

  it('clones page and copies form bindings', async () => {
    const res = await request(app)
      .post('/api/v1/pages/page-1/clone')
      .set('X-Test-Auth', '1')
      .send({})
      .expect(201);

    expect(res.body.page).toBeDefined();
    expect(res.body.page.formBindings).toHaveLength(1);
    expect(res.body.page.formBindings[0]).toMatchObject({
      formId: 'form-1',
      type: 'hooked',
      selector: 'form#contact',
      fieldMappings: { email: 'email', first_name: 'fname' },
    });

    expect(mockPrisma.pageFormBinding.create).toHaveBeenCalledWith({
      data: {
        pageId: 'page-2',
        formId: 'form-1',
        blockId: null,
        type: 'hooked',
        selector: 'form#contact',
        fieldMappings: { email: 'email', first_name: 'fname' },
      },
    });
  });

  it('returns 404 when source page not found', async () => {
    mockPrisma.page.findFirst.mockResolvedValue(null);

    await request(app)
      .post('/api/v1/pages/nonexistent/clone')
      .set('X-Test-Auth', '1')
      .send({})
      .expect(404);
  });

  it('accepts custom name and slug', async () => {
    mockPrisma.page.findMany.mockResolvedValue([]);
    mockPrisma.page.create.mockResolvedValue({
      id: 'page-2',
      name: 'My Clone',
      slug: 'my-clone',
      formBindings: [],
    });
    mockPrisma.page.findUnique.mockResolvedValue({
      id: 'page-2',
      name: 'My Clone',
      slug: 'my-clone',
      formBindings: [],
    });

    const res = await request(app)
      .post('/api/v1/pages/page-1/clone')
      .set('X-Test-Auth', '1')
      .send({ name: 'My Clone', slug: 'my-clone' })
      .expect(201);

    expect(mockPrisma.page.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'My Clone',
        slug: 'my-clone',
      }),
    });
  });
});
