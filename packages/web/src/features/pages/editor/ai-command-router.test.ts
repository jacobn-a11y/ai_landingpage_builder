import { describe, expect, it, vi } from 'vitest';
import { runAiCommand } from './ai-command-router';
import type { AiCommandContext } from './ai-command-router';

function createContext(): AiCommandContext {
  const content = {
    schemaVersion: 1,
    root: 'root',
    blocks: {
      root: { id: 'root', type: 'section', children: ['btn1'] },
      btn1: { id: 'btn1', type: 'button', props: { text: 'Buy now', href: '#' } },
    },
  };
  return {
    content,
    selectedBlockId: 'btn1',
    selectedBlockIds: ['btn1'],
    insertBlock: vi.fn(() => 'new-block'),
    updateBlock: vi.fn(),
    setSelectedBlockId: vi.fn(),
    removeBlocks: vi.fn(),
    copyBlocks: vi.fn(),
    pasteBlocks: vi.fn(() => ['copy1']),
    undo: vi.fn(),
    redo: vi.fn(),
  };
}

describe('ai-command-router', () => {
  it('handles undo command', () => {
    const ctx = createContext();
    const result = runAiCommand('undo last change', ctx);
    expect(result.handled).toBe(true);
    expect(ctx.undo).toHaveBeenCalledTimes(1);
  });

  it('handles CTA prominence command for selected button', () => {
    const ctx = createContext();
    const result = runAiCommand('make the cta more prominent', ctx);
    expect(result.handled).toBe(true);
    expect(ctx.updateBlock).toHaveBeenCalledTimes(1);
  });

  it('returns fallback when command is unknown', () => {
    const ctx = createContext();
    const result = runAiCommand('please do something magical', ctx);
    expect(result.handled).toBe(false);
    expect(result.summary.toLowerCase()).toContain('no deterministic command');
  });
});
