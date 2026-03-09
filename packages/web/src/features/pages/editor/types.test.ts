import { describe, expect, it } from 'vitest';
import { toEditorContentJson, toPageContentJson } from './types';

describe('editor content schema normalization', () => {
  it('normalizes legacy/invalid content into schema-versioned document', () => {
    const editor = toEditorContentJson({
      root: 'missing',
      blocks: {
        a: { id: 'a', type: 'section', children: ['b', 'missing-child'] },
        b: { id: 'b', type: 'text', props: { content: 'Hello' } },
        bad: { id: 'bad', type: 'not-real' },
      },
    });

    expect(editor.schemaVersion).toBe(1);
    expect(editor.root).toBe('a');
    expect(Object.keys(editor.blocks)).toEqual(['a', 'b']);
    expect(editor.blocks.a.children).toEqual(['b']);
    expect(editor.blocks.b.type).toBe('paragraph');
  });

  it('persists schemaVersion when converting back to storage json', () => {
    const stored = toPageContentJson(
      toEditorContentJson({
        root: 'x',
        blocks: {
          x: { id: 'x', type: 'section', children: ['y'] },
          y: { id: 'y', type: 'paragraph', props: { content: 'Copy' } },
        },
      })
    );

    expect(stored.schemaVersion).toBe(1);
    expect(stored.root).toBe('x');
    expect(stored.blocks.y.type).toBe('paragraph');
  });
});
