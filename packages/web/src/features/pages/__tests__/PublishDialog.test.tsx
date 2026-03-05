import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { PublishDialog } from '../PublishDialog';

const { mockGetPublishStatus, mockDomainsList } = vi.hoisted(() => ({
  mockGetPublishStatus: vi.fn(),
  mockDomainsList: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    pages: {
      getPublishStatus: mockGetPublishStatus,
      publish: vi.fn().mockResolvedValue({ ok: true }),
      unpublish: vi.fn().mockResolvedValue({ ok: true }),
      updatePublishSchedule: vi.fn().mockResolvedValue({ ok: true }),
    },
    domains: { list: mockDomainsList },
  },
}));

const mockPage = {
  id: 'page-1',
  workspaceId: 'ws-1',
  folderId: null,
  name: 'Test Page',
  slug: 'test-page',
  contentJson: {},
  scripts: null,
  publishConfig: {},
  formBindings: [],
  version: 1,
  createdAt: '2024-01-01T00:00:00Z',
};

const mockPublishStatus = {
  publishConfig: { targetType: 'demo', path: '/test-page', status: 'draft' },
  status: 'draft' as const,
  targetLabel: 'Not published',
};

const mockDomains = [
  { id: 'dom-1', hostname: 'landing.example.com', status: 'Active' },
];

describe('PublishDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPublishStatus.mockResolvedValue({ publishStatus: mockPublishStatus });
    mockDomainsList.mockResolvedValue({ domains: mockDomains });
  });

  it('renders when open and fetches status', async () => {
    render(
      <PublishDialog
        open={true}
        onOpenChange={vi.fn()}
        page={mockPage}
        onPublished={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Publish')).toBeInTheDocument();
    });
    expect(screen.getByText('Publish this page to a demo domain or a verified custom domain.')).toBeInTheDocument();
  });

  it('shows Publish target select', async () => {
    render(
      <PublishDialog open={true} onOpenChange={vi.fn()} page={mockPage} />
    );

    await waitFor(() => {
      expect(screen.getByText('Publish target')).toBeInTheDocument();
    });
  });
});
