import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';

interface BlockTableProps {
  id: string;
  rows?: string[][];
  hasHeader?: boolean;
  editMode: boolean;
  className?: string;
}

const DEFAULT_ROWS = [
  ['Header 1', 'Header 2', 'Header 3'],
  ['Cell 1', 'Cell 2', 'Cell 3'],
  ['Cell 4', 'Cell 5', 'Cell 6'],
];

export function BlockTable({
  id,
  rows = DEFAULT_ROWS,
  hasHeader = true,
  editMode,
  className,
}: BlockTableProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);

  if (editMode) {
    return (
      <div
        className={cn(
          'overflow-x-auto rounded border-2 border-dashed border-muted-foreground/30 cursor-pointer',
          selected && 'border-primary',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        <table className="w-full border-collapse text-sm">
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) =>
                  hasHeader && ri === 0 ? (
                    <th key={ci} className="border border-border px-3 py-2 text-left font-medium bg-muted/50">
                      {cell}
                    </th>
                  ) : (
                    <td key={ci} className="border border-border px-3 py-2">
                      {cell}
                    </td>
                  )
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) =>
                hasHeader && ri === 0 ? (
                  <th key={ci} className="border border-border px-3 py-2 text-left font-medium bg-muted/50">
                    {cell}
                  </th>
                ) : (
                  <td key={ci} className="border border-border px-3 py-2">
                    {cell}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
