/**
 * Block templates dropdown: insert predefined block structures.
 */

import { Button } from '@/components/ui/button';
import { useEditor } from './EditorContext';
import { BLOCK_TEMPLATES } from './block-templates';
import { Layout, Plus } from 'lucide-react';

export function BlockTemplatesDropdown() {
  const { insertBlockFromLibrary, content, selectedBlockId } = useEditor();
  const targetParentId = selectedBlockId ?? content.root ?? null;

  const handleInsert = (blockJson: { root: string; blocks: Record<string, object> }) => {
    insertBlockFromLibrary(blockJson, targetParentId);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
        <Layout className="h-3.5 w-3.5" />
        <span>Templates</span>
      </div>
      {BLOCK_TEMPLATES.map((t) => (
        <Button
          key={t.id}
          variant="ghost"
          size="sm"
          className="justify-start text-left h-8 px-2"
          onClick={() => handleInsert(t.blockJson)}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          {t.label}
        </Button>
      ))}
    </div>
  );
}
