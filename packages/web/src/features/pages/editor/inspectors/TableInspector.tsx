/**
 * Inspector for table blocks.
 */

import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Minus } from 'lucide-react';
import { InspectorSection } from './InspectorSection';
import type { InspectorProps } from './inspector-registry';

export function TableInspector({ blockId, block, updateBlock }: InspectorProps) {
  const props = (block.props ?? {}) as Record<string, unknown>;

  const set = (key: string, value: unknown) => {
    updateBlock(blockId, { props: { ...props, [key]: value } });
  };

  const rows = (Array.isArray(props.rows) ? props.rows : [['H1', 'H2'], ['C1', 'C2']]) as string[][];

  const addRow = () => {
    const cols = rows[0]?.length ?? 2;
    set('rows', [...rows, Array(cols).fill('')]);
  };

  const removeRow = () => {
    if (rows.length > 1) set('rows', rows.slice(0, -1));
  };

  const addColumn = () => {
    set('rows', rows.map((r) => [...r, '']));
  };

  const removeColumn = () => {
    if ((rows[0]?.length ?? 0) > 1) {
      set('rows', rows.map((r) => r.slice(0, -1)));
    }
  };

  return (
    <div className="space-y-4">
      <InspectorSection title="Table">
        <div className="flex items-center gap-2">
          <Switch
            checked={(props.hasHeader as boolean) ?? true}
            onCheckedChange={(v) => set('hasHeader', v)}
          />
          <Label className="text-xs">Header row</Label>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground">Rows: {rows.length}</Label>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={addRow}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={removeRow} disabled={rows.length <= 1}>
                <Minus className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-[10px] text-muted-foreground">Columns: {rows[0]?.length ?? 0}</Label>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={addColumn}>
                <Plus className="h-3 w-3" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={removeColumn} disabled={(rows[0]?.length ?? 0) <= 1}>
                <Minus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      </InspectorSection>

      <InspectorSection title="Data (JSON)" defaultOpen={false}>
        <div className="space-y-2">
          <Textarea
            value={JSON.stringify(rows, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value || '[]');
                if (Array.isArray(parsed)) set('rows', parsed);
              } catch {
                // invalid json, ignore
              }
            }}
            className="min-h-[100px] font-mono text-xs"
          />
          <p className="text-[10px] text-muted-foreground">
            2D array of strings. Each sub-array is a row.
          </p>
        </div>
      </InspectorSection>
    </div>
  );
}
