/**
 * Tier C Token Editor — constrained editing for isolated HTML blocks.
 *
 * Provides handle-based editing for:
 * - Text tokens: click to edit string
 * - Image tokens: click to replace asset
 * - Link tokens: click to edit href/text
 *
 * No freeform DOM editing allowed.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

// --- Types ---

export interface TokenDef {
  id: string;
  type: 'text' | 'image' | 'link';
  selector: string;
  current: string | { href: string; text: string };
}

interface TierCTokenEditorProps {
  html: string;
  tokens: TokenDef[];
  onTokenUpdate: (tokenId: string, newValue: string | { href: string; text: string }) => void;
  previewMode?: boolean;
}

// --- Component ---

export function TierCTokenEditor({
  html,
  tokens,
  onTokenUpdate,
  previewMode = false,
}: TierCTokenEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [editingToken, setEditingToken] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // Apply current token values to the HTML
  const processedHtml = useCallback(() => {
    let result = html;
    for (const token of tokens) {
      if (token.type === 'text' && typeof token.current === 'string') {
        // For text tokens, we rely on data-import-id selectors in the HTML
        // The actual replacement happens via DOM manipulation after render
      }
    }
    return result;
  }, [html, tokens]);

  // Set up click handlers on token elements after render
  useEffect(() => {
    if (!containerRef.current || previewMode) return;

    const container = containerRef.current;

    for (const token of tokens) {
      const elements = container.querySelectorAll(token.selector);
      elements.forEach((el) => {
        (el as HTMLElement).style.cursor = 'pointer';
        (el as HTMLElement).style.outline = editingToken === token.id
          ? '2px solid #3b82f6'
          : '1px dashed transparent';
        (el as HTMLElement).title = `Click to edit ${token.type}`;

        // Add click handler
        const handler = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          setEditingToken(token.id);
          if (typeof token.current === 'string') {
            setEditValue(token.current);
          } else {
            setEditValue(token.current.text);
          }
        };
        el.addEventListener('click', handler);

        // Store handler for cleanup
        (el as any).__tokenHandler = handler;
      });
    }

    return () => {
      for (const token of tokens) {
        const elements = container.querySelectorAll(token.selector);
        elements.forEach((el) => {
          if ((el as any).__tokenHandler) {
            el.removeEventListener('click', (el as any).__tokenHandler);
            delete (el as any).__tokenHandler;
          }
        });
      }
    };
  }, [tokens, editingToken, previewMode]);

  const handleSave = useCallback(() => {
    if (!editingToken) return;
    const token = tokens.find((t) => t.id === editingToken);
    if (!token) return;

    if (token.type === 'text') {
      onTokenUpdate(token.id, editValue);
    } else if (token.type === 'link' && typeof token.current === 'object') {
      onTokenUpdate(token.id, { ...token.current, text: editValue });
    }

    setEditingToken(null);
    setEditValue('');
  }, [editingToken, editValue, tokens, onTokenUpdate]);

  const handleCancel = useCallback(() => {
    setEditingToken(null);
    setEditValue('');
  }, []);

  return (
    <div className="tier-c-editor relative">
      {/* Rendered HTML */}
      <div
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: processedHtml() }}
        className={previewMode ? '' : 'tier-c-editable'}
      />

      {/* Token edit popover */}
      {editingToken && (
        <div className="absolute top-0 left-0 right-0 z-50 bg-background border rounded-lg shadow-lg p-3 m-2">
          <div className="text-xs text-muted-foreground mb-1">
            Editing {tokens.find((t) => t.id === editingToken)?.type} token
          </div>
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') handleCancel();
            }}
            className="w-full border rounded px-2 py-1 text-sm mb-2"
            autoFocus
          />
          <div className="flex gap-1 justify-end">
            <button
              onClick={handleCancel}
              className="px-2 py-1 text-xs rounded border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
