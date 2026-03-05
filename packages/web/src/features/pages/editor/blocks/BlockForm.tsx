import { useEditor } from '../EditorContext';
import { cn } from '@/lib/utils';
import type { PageFormBinding } from '@/lib/api';

interface BlockFormProps {
  id: string;
  formId?: string;
  formBindings?: PageFormBinding[];
  editMode: boolean;
  className?: string;
}

export function BlockForm({
  id,
  formId,
  formBindings = [],
  editMode,
  className,
}: BlockFormProps) {
  const { handleBlockClick, selectedBlockIds } = useEditor();
  const selected = selectedBlockIds.includes(id);
  const binding = formBindings.find((b) => b.blockId === id && b.type === 'native');
  const resolvedFormId = formId ?? binding?.formId;

  if (editMode) {
    return (
      <div
        className={cn(
          'min-h-[120px] rounded border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center',
          selected && 'border-primary',
          className
        )}
        onClick={(e) => {
          e.stopPropagation();
          handleBlockClick(id, e);
        }}
      >
        <span className="text-sm text-muted-foreground">
          {resolvedFormId
            ? `Form block (select form in properties)`
            : 'Select a form in the properties panel'}
        </span>
      </div>
    );
  }

  if (!resolvedFormId) return null;

  return (
    <div className={cn('', className)} data-form-block={id} data-form-id={resolvedFormId}>
      {/* Form will be rendered by the page viewer - this is a placeholder */}
      <div className="rounded border bg-muted/30 p-4 text-sm text-muted-foreground">
        Form: {resolvedFormId}
      </div>
    </div>
  );
}
