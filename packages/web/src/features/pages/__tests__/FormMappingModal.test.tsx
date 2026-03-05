import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FormMappingModal } from '../FormMappingModal';

const { mockGetDetectedForms } = vi.hoisted(() => ({
  mockGetDetectedForms: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  api: {
    pages: {
      getDetectedForms: mockGetDetectedForms,
      update: vi.fn().mockResolvedValue({ page: {} }),
    },
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

const mockForms = [
  {
    selector: 'form#contact',
    fields: [
      { name: 'email', id: 'email', type: 'email', suggestedCanonical: 'email' },
      { name: 'fname', id: 'fname', type: 'text', suggestedCanonical: 'first_name' },
    ],
  },
];

describe('FormMappingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDetectedForms.mockResolvedValue({ forms: mockForms });
  });

  it('renders when open and fetches detected forms', async () => {
    render(
      <FormMappingModal
        open={true}
        onOpenChange={vi.fn()}
        page={mockPage}
        onSaved={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Map form')).toBeInTheDocument();
    });
    expect(screen.getByText(/Select a detected form/)).toBeInTheDocument();
  });

  it('shows no forms message when none detected', async () => {
    mockGetDetectedForms.mockResolvedValue({ forms: [] });

    render(
      <FormMappingModal open={true} onOpenChange={vi.fn()} page={mockPage} />
    );

    await waitFor(() => {
      expect(screen.getByText(/No forms detected/)).toBeInTheDocument();
    });
  });
});
