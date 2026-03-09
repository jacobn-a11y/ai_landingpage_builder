/**
 * Properties panel with registry-driven block inspector and page-level quality guardrails.
 */

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Trash2 } from 'lucide-react';
import { useEditor } from './EditorContext';
import { OverlaysPanel } from './OverlaysPanel';
import { PageScriptsPanel } from './PageScriptsPanel';
import { PageSettingsPanel } from './PageSettingsPanel';
import { UniversalPropertiesSection } from './UniversalPropertiesSection';
import { renderBlockInspectorFields } from './inspector-registry';
import { validatePageQuality } from './quality/validator';
import { evaluateLaunchReadiness } from './quality/launch-gates';
import { getEditorMetricEvents, summarizeEditorMetrics } from './quality/metrics';
import { editorRollout } from './quality/rollout';

function QualityGuardrails() {
  const { content, setSelectedBlockId } = useEditor();
  const issues = validatePageQuality(content);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Quality guardrails</div>
      {issues.length === 0 ? (
        <p className="text-xs text-emerald-600">No current quality issues detected.</p>
      ) : (
        <div className="space-y-2">
          {issues.slice(0, 12).map((issue) => (
            <div key={issue.id} className="rounded border p-2">
              <p className={`text-xs font-medium ${issue.severity === 'error' ? 'text-rose-600' : 'text-amber-600'}`}>
                {issue.severity.toUpperCase()}
              </p>
              <p className="text-xs text-muted-foreground">{issue.message}</p>
              {issue.blockId && (
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setSelectedBlockId(issue.blockId ?? null)}
                >
                  Jump to block
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MutationFeed() {
  const { mutationLog } = useEditor();
  const entries = mutationLog.slice(-10).reverse();
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Recent changes</div>
      {entries.length === 0 ? (
        <p className="text-xs text-muted-foreground">No editor changes in this session yet.</p>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded border px-2 py-1">
              <p className="text-xs font-medium">{entry.kind}</p>
              <p className="text-[10px] text-muted-foreground">{new Date(entry.at).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LaunchGatesPanel() {
  const { content } = useEditor();
  const qualityIssues = validatePageQuality(content);
  const readiness = evaluateLaunchReadiness(
    summarizeEditorMetrics(getEditorMetricEvents().slice(-500)),
    qualityIssues
  );

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Launch gates</div>
      <div className="space-y-1">
        {readiness.gates.map((gate) => (
          <div key={gate.id} className="rounded border px-2 py-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium">{gate.label}</p>
              <span className={`text-[10px] font-medium ${gate.pass ? 'text-emerald-600' : gate.blocking ? 'text-rose-600' : 'text-amber-600'}`}>
                {gate.pass ? 'PASS' : gate.blocking ? 'BLOCK' : 'WARN'}
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground">{gate.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PropertiesPanel() {
  const {
    content,
    selectedBlockId,
    selectedBlockIds,
    updateBlock,
    removeBlocks,
    layoutMode,
    breakpoint,
    copyBlocks,
    pasteBlocks,
    groupBlocks,
    ungroupBlock,
    alignBlocks,
    distributeBlocks,
    centerBlocksInCanvas,
    tidyVerticalSpacing,
    updateBlocksZIndex,
  } = useEditor();

  if (!selectedBlockId && selectedBlockIds.length === 0) {
    return (
      <div className="flex flex-col border-l bg-muted/20 min-w-[250px]">
        <div className="p-2 border-b text-sm font-medium">Page settings</div>
        <div className="flex-1 overflow-auto p-3 space-y-4">
          <PageSettingsPanel />
          <div className="pt-2 border-t">
            <OverlaysPanel />
          </div>
          <div className="pt-2 border-t">
            <PageScriptsPanel />
          </div>
          {editorRollout.showQualityGuardrailsPanel && (
            <div className="pt-2 border-t">
              <QualityGuardrails />
            </div>
          )}
          {editorRollout.showLaunchGatesPanel && (
            <div className="pt-2 border-t">
              <LaunchGatesPanel />
            </div>
          )}
          <div className="pt-2 border-t">
            <MutationFeed />
          </div>
        </div>
      </div>
    );
  }

  const block = content.blocks[selectedBlockId!];
  if (!block) {
    return (
      <div className="flex flex-col border-l bg-muted/20 min-w-[250px]">
        <div className="p-2 border-b text-sm font-medium">Properties</div>
        <div className="flex-1 p-4 text-sm text-muted-foreground text-center">Block not found</div>
      </div>
    );
  }

  const props = (block.props ?? {}) as Record<string, unknown>;
  const handlePropChange = (keyOrUpdates: string | Record<string, unknown>, value?: unknown) => {
    const updates = typeof keyOrUpdates === 'object' ? keyOrUpdates : { [keyOrUpdates]: value };
    if (selectedBlockIds.length > 1) {
      selectedBlockIds.forEach((id) => {
        const existing = (content.blocks[id]?.props ?? {}) as Record<string, unknown>;
        updateBlock(id, { props: { ...existing, ...updates } });
      });
      return;
    }
    updateBlock(selectedBlockId!, { props: { ...props, ...updates } });
  };

  return (
    <div className="flex flex-col border-l bg-muted/20 min-w-[250px]">
      <div className="p-2 border-b text-sm font-medium">Properties</div>
      <div className="flex-1 overflow-auto p-3 space-y-4">
        <div className="space-y-1">
          <Label className="text-xs">Block type</Label>
          <div className="text-sm text-muted-foreground capitalize">{block.type}</div>
        </div>

        {renderBlockInspectorFields(block.type, {
          props,
          onPropChange: handlePropChange,
        })}

        <UniversalPropertiesSection
          props={props}
          onPropChange={(updates) => handlePropChange(updates)}
          layoutMode={layoutMode}
          breakpoint={breakpoint}
        />

        {selectedBlockIds.length > 0 && (
          <div className="flex flex-wrap gap-1 py-2 border-t">
            <Button variant="outline" size="sm" onClick={copyBlocks} title="Copy (Ctrl+C)">Copy</Button>
            <Button variant="outline" size="sm" onClick={() => pasteBlocks(content.root ?? null)} title="Paste (Ctrl+V)">Paste</Button>
            {selectedBlockIds.length >= 2 && (
              <>
                <Button variant="outline" size="sm" onClick={groupBlocks} title="Group (Ctrl+G)">Group</Button>
                {layoutMode === 'canvas' && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('left')}>Align L</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('center')}>Align C</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('right')}>Align R</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('top')}>Align T</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('middle')}>Align M</Button>
                    <Button variant="outline" size="sm" onClick={() => alignBlocks('bottom')}>Align B</Button>
                    <Button variant="outline" size="sm" onClick={() => centerBlocksInCanvas('horizontal')}>Center H</Button>
                    <Button variant="outline" size="sm" onClick={() => centerBlocksInCanvas('vertical')}>Center V</Button>
                    <Button variant="outline" size="sm" onClick={() => distributeBlocks('horizontal')}>Dist H</Button>
                    <Button variant="outline" size="sm" onClick={() => distributeBlocks('vertical')}>Dist V</Button>
                    <Button variant="outline" size="sm" onClick={tidyVerticalSpacing}>Tidy Y</Button>
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(1)}>↑</Button>
                    <Button variant="outline" size="sm" onClick={() => updateBlocksZIndex(-1)}>↓</Button>
                  </>
                )}
              </>
            )}
            {selectedBlockIds.length === 1 && content.blocks[selectedBlockIds[0]]?.type === 'container' && (
              <Button variant="outline" size="sm" onClick={ungroupBlock} title="Ungroup (Ctrl+Shift+G)">Ungroup</Button>
            )}
          </div>
        )}

        <div className="pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-destructive hover:text-destructive"
            onClick={() => removeBlocks(selectedBlockIds)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Remove {selectedBlockIds.length > 1 ? `${selectedBlockIds.length} blocks` : 'block'}
          </Button>
        </div>
      </div>
    </div>
  );
}
