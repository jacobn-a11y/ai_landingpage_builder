import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImportPageDialog } from '../ImportPageDialog';
import type { FolderNode } from '@/lib/api';

vi.mock('@/lib/html-import', () => ({
  htmlToBlocks: vi.fn().mockReturnValue({ blocks: { b1: { type: 'section' } } }),
  detectFormsFromHtml: vi.fn().mockReturnValue([]),
  extractHtmlFromMhtml: vi.fn().mockReturnValue(null),
}));

const mockFolders: FolderNode[] = [
  { id: 'f1', workspaceId: 'ws-1', parentId: null, name: 'Root', children: [] as FolderNode[] },
];

describe('ImportPageDialog', () => {
  it('renders when open', () => {
    render(
      <ImportPageDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue({ page: { id: 'p1' } })}
        folders={mockFolders}
      />
    );

    expect(screen.getByText('Import HTML')).toBeInTheDocument();
    expect(screen.getByText('HTML file or folder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('shows replace mode when replacePageId provided', () => {
    render(
      <ImportPageDialog
        open={true}
        onOpenChange={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue({ page: { id: 'p1' } })}
        folders={mockFolders}
        replacePageId="page-1"
        replacePageName="Existing Page"
      />
    );

    expect(screen.getByText('Replace page content')).toBeInTheDocument();
    expect(screen.getByText(/Replace content of "Existing Page"/)).toBeInTheDocument();
  });
});
