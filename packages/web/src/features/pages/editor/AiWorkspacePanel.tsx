import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useEditor } from './EditorContext';
import { runAiCommand } from './ai-command-router';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  operations?: string[];
}

function messageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function AiWorkspacePanel() {
  const editor = useEditor();
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AiMessage[]>([]);

  const sectionMap = useMemo(() => {
    const root = editor.content.root ? editor.content.blocks[editor.content.root] : null;
    const children = root?.children ?? [];
    return children
      .map((id) => editor.content.blocks[id])
      .filter(Boolean)
      .map((block) => ({ id: block.id, type: block.type }));
  }, [editor.content]);

  const submitPrompt = () => {
    const text = prompt.trim();
    if (!text) return;
    setMessages((prev) => [...prev, { id: messageId(), role: 'user', text }]);

    const result = runAiCommand(text, {
      content: editor.content,
      selectedBlockId: editor.selectedBlockId,
      selectedBlockIds: editor.selectedBlockIds,
      insertBlock: editor.insertBlock,
      updateBlock: editor.updateBlock,
      setSelectedBlockId: editor.setSelectedBlockId,
      removeBlocks: editor.removeBlocks,
      copyBlocks: editor.copyBlocks,
      pasteBlocks: editor.pasteBlocks,
      undo: editor.undo,
      redo: editor.redo,
    });

    setMessages((prev) => [
      ...prev,
      {
        id: messageId(),
        role: 'assistant',
        text: result.summary,
        operations: result.operations,
      },
    ]);
    setPrompt('');
  };

  return (
    <aside className="w-[360px] border-l bg-background flex flex-col min-h-0">
      <div className="px-3 py-2 border-b">
        <h2 className="text-sm font-semibold">AI Workspace</h2>
        <p className="text-xs text-muted-foreground">Page-aware command runner for this draft session.</p>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-3 space-y-3">
        <div className="space-y-2">
          <div className="text-xs font-medium">Conversation</div>
          {messages.length === 0 ? (
            <p className="text-xs text-muted-foreground">Try: "tighten spacing", "undo", or "add comparison section".</p>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div key={message.id} className={`rounded border p-2 ${message.role === 'assistant' ? 'bg-muted/40' : ''}`}>
                  <p className="text-[11px] font-semibold">{message.role === 'assistant' ? 'AI' : 'You'}</p>
                  <p className="text-xs">{message.text}</p>
                  {message.operations?.length ? (
                    <p className="text-[10px] text-muted-foreground mt-1">{message.operations.join(' | ')}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium">Section map</div>
          {sectionMap.length === 0 ? (
            <p className="text-xs text-muted-foreground">No top-level sections yet.</p>
          ) : (
            <div className="space-y-1">
              {sectionMap.map((section, idx) => (
                <button
                  key={section.id}
                  type="button"
                  className="w-full text-left rounded border px-2 py-1 text-xs hover:bg-muted/40"
                  onClick={() => editor.setSelectedBlockId(section.id)}
                >
                  {idx + 1}. {section.type} <span className="text-muted-foreground">({section.id})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="text-xs font-medium">AI-visible change log</div>
          {editor.mutationLog.length === 0 ? (
            <p className="text-xs text-muted-foreground">No changes recorded.</p>
          ) : (
            <div className="space-y-1">
              {editor.mutationLog.slice(-8).reverse().map((entry) => (
                <div key={entry.id} className="rounded border px-2 py-1">
                  <p className="text-xs font-medium">{entry.kind}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(entry.at).toLocaleTimeString()}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-t space-y-2">
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Tell AI what to change..."
          className="min-h-[88px] text-sm"
        />
        <Button className="w-full" onClick={submitPrompt}>Apply Request</Button>
      </div>
    </aside>
  );
}
