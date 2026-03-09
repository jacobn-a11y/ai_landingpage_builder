/**
 * Block toolbar: add blocks to the page.
 */

import { useEditor } from './EditorContext';
import { BLOCK_DEFINITIONS } from './block-registry';
import { LibraryDropdown } from './LibraryDropdown';
import { BlockTemplatesDropdown } from './BlockTemplatesDropdown';
import { Button } from '@/components/ui/button';
import { Plus, Layout, Type, Square } from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  layout: <Layout className="h-4 w-4" />,
  content: <Type className="h-4 w-4" />,
  pattern: <Square className="h-4 w-4" />,
  form: <Square className="h-4 w-4" />,
  embed: <Square className="h-4 w-4" />,
};

export function BlockToolbar() {
  const { insertBlock, content, selectedBlockId } = useEditor();
  const targetParentId = selectedBlockId ?? content.root ?? null;

  const byCategory = BLOCK_DEFINITIONS.reduce(
    (acc, def) => {
      if (def.visibleInToolbar === false) return acc;
      if (!acc[def.category]) acc[def.category] = [];
      acc[def.category].push(def);
      return acc;
    },
    {} as Record<string, typeof BLOCK_DEFINITIONS>
  );

  return (
    <div className="flex flex-col gap-2 p-2 border-r bg-muted/20">
      <div className="text-xs font-medium text-muted-foreground px-2 py-1">
        Add block
      </div>
      <BlockTemplatesDropdown />
      <LibraryDropdown />
      {Object.entries(byCategory).map(([category, defs]) => (
        <div key={category} className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
            {CATEGORY_ICONS[category]}
            <span className="capitalize">{category}</span>
          </div>
          {defs.map((def) => (
            <Button
              key={def.type}
              variant="ghost"
              size="sm"
              className="justify-start text-left h-8 px-2"
              onClick={() => insertBlock(def.type, targetParentId)}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
              {def.label}
            </Button>
          ))}
        </div>
      ))}
    </div>
  );
}
