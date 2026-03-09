import { describe, it, expect, beforeEach } from 'vitest';
import type { EditorContentJson } from '../../types';
import type { EditorMutation } from '../types';
import {
  applyMutation,
  applyMutations,
  resetIdCounter,
} from '../apply-mutation';
import { validateMutation } from '../validate-mutation';
import {
  createTransaction,
  executeTransaction,
  resetTxnCounter,
} from '../transaction';
import { PatchHistory } from '../patch-history';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<EditorContentJson>): EditorContentJson {
  return {
    root: 'root-1',
    blocks: {
      'root-1': { id: 'root-1', type: 'section', children: [] },
    },
    layoutMode: 'fluid',
    ...overrides,
  };
}

function stateWithChild(): EditorContentJson {
  return {
    root: 'root-1',
    blocks: {
      'root-1': { id: 'root-1', type: 'section', children: ['child-1'] },
      'child-1': { id: 'child-1', type: 'text', props: { content: 'hello' }, children: [] },
    },
    layoutMode: 'fluid',
  };
}

function stateWithNestedChildren(): EditorContentJson {
  return {
    root: 'root-1',
    blocks: {
      'root-1': { id: 'root-1', type: 'section', children: ['container-1'] },
      'container-1': {
        id: 'container-1',
        type: 'container',
        children: ['text-1', 'text-2'],
      },
      'text-1': { id: 'text-1', type: 'text', props: { content: 'a' }, children: [] },
      'text-2': { id: 'text-2', type: 'text', props: { content: 'b' }, children: [] },
    },
    layoutMode: 'fluid',
  };
}

// ---------------------------------------------------------------------------
// applyMutation tests
// ---------------------------------------------------------------------------

describe('applyMutation', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  describe('insertBlock', () => {
    it('inserts a block into a parent with a given ID', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'insertBlock',
        parentId: 'root-1',
        blockType: 'text',
        blockId: 'new-text',
        props: { content: 'Hi' },
      });

      expect(result.success).toBe(true);
      expect(result.blockId).toBe('new-text');
      expect(result.newContent!.blocks['new-text']).toBeDefined();
      expect(result.newContent!.blocks['new-text'].type).toBe('text');
      expect(result.newContent!.blocks['new-text'].props).toEqual({ content: 'Hi' });
      expect(result.newContent!.blocks['root-1'].children).toContain('new-text');
    });

    it('inserts at a specific index', () => {
      const state = stateWithNestedChildren();
      const result = applyMutation(state, {
        type: 'insertBlock',
        parentId: 'container-1',
        index: 0,
        blockType: 'button',
        blockId: 'btn-1',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['container-1'].children![0]).toBe('btn-1');
    });

    it('generates an ID when blockId is not provided', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'insertBlock',
        parentId: 'root-1',
        blockType: 'text',
      });

      expect(result.success).toBe(true);
      expect(result.blockId).toMatch(/^blk_/);
    });

    it('inserts into root block children when parentId is null', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'insertBlock',
        parentId: null,
        blockType: 'text',
        blockId: 'orphan-text',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['root-1'].children).toContain('orphan-text');
    });

    it('fails when parent block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'insertBlock',
        parentId: 'nonexistent',
        blockType: 'text',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateBlockProps', () => {
    it('merges new props into existing block', () => {
      const state = stateWithChild();
      const result = applyMutation(state, {
        type: 'updateBlockProps',
        blockId: 'child-1',
        props: { color: 'red', fontSize: 16 },
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['child-1'].props).toEqual({
        content: 'hello',
        color: 'red',
        fontSize: 16,
      });
    });

    it('fails when block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'updateBlockProps',
        blockId: 'nope',
        props: { x: 1 },
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('removeBlock', () => {
    it('removes a block from parent children and block map', () => {
      const state = stateWithChild();
      const result = applyMutation(state, {
        type: 'removeBlock',
        blockId: 'child-1',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['child-1']).toBeUndefined();
      expect(result.newContent!.blocks['root-1'].children).not.toContain('child-1');
    });

    it('removes descendants recursively', () => {
      const state = stateWithNestedChildren();
      const result = applyMutation(state, {
        type: 'removeBlock',
        blockId: 'container-1',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['container-1']).toBeUndefined();
      expect(result.newContent!.blocks['text-1']).toBeUndefined();
      expect(result.newContent!.blocks['text-2']).toBeUndefined();
    });

    it('clears root when root block is removed', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'removeBlock',
        blockId: 'root-1',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.root).toBe('');
    });

    it('fails when block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'removeBlock',
        blockId: 'nope',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('moveBlock', () => {
    it('moves a block from one parent to another', () => {
      const state: EditorContentJson = {
        root: 'root-1',
        blocks: {
          'root-1': { id: 'root-1', type: 'section', children: ['container-a', 'container-b'] },
          'container-a': { id: 'container-a', type: 'container', children: ['text-1'] },
          'container-b': { id: 'container-b', type: 'container', children: [] },
          'text-1': { id: 'text-1', type: 'text', props: { content: 'move me' }, children: [] },
        },
        layoutMode: 'fluid',
      };

      const result = applyMutation(state, {
        type: 'moveBlock',
        blockId: 'text-1',
        parentId: 'container-b',
        index: 0,
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['container-a'].children).not.toContain('text-1');
      expect(result.newContent!.blocks['container-b'].children).toContain('text-1');
    });

    it('fails on circular move', () => {
      const state = stateWithNestedChildren();
      const result = applyMutation(state, {
        type: 'moveBlock',
        blockId: 'container-1',
        parentId: 'text-1',
        index: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('descendant');
    });

    it('fails when block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'moveBlock',
        blockId: 'nope',
        parentId: 'root-1',
        index: 0,
      });

      expect(result.success).toBe(false);
    });

    it('fails when target parent does not exist', () => {
      const state = stateWithChild();
      const result = applyMutation(state, {
        type: 'moveBlock',
        blockId: 'child-1',
        parentId: 'nope',
        index: 0,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('replaceText', () => {
    it('replaces content prop on a block', () => {
      const state = stateWithChild();
      const result = applyMutation(state, {
        type: 'replaceText',
        blockId: 'child-1',
        content: 'world',
        contentHtml: '<p>world</p>',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['child-1'].props!.content).toBe('world');
      expect(result.newContent!.blocks['child-1'].props!.contentHtml).toBe('<p>world</p>');
    });

    it('fails when block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'replaceText',
        blockId: 'nope',
        content: 'x',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('duplicateBlock', () => {
    it('duplicates a block with a new ID after the original', () => {
      const state = stateWithChild();
      const result = applyMutation(state, {
        type: 'duplicateBlock',
        blockId: 'child-1',
      });

      expect(result.success).toBe(true);
      expect(result.blockId).toBeDefined();
      expect(result.blockId).not.toBe('child-1');

      const newBlock = result.newContent!.blocks[result.blockId!];
      expect(newBlock).toBeDefined();
      expect(newBlock.type).toBe('text');
      expect(newBlock.props!.content).toBe('hello');

      // Should be in parent's children after the original
      const rootChildren = result.newContent!.blocks['root-1'].children!;
      const origIdx = rootChildren.indexOf('child-1');
      const newIdx = rootChildren.indexOf(result.blockId!);
      expect(newIdx).toBe(origIdx + 1);
    });

    it('deep-clones nested children with new IDs', () => {
      const state = stateWithNestedChildren();
      const result = applyMutation(state, {
        type: 'duplicateBlock',
        blockId: 'container-1',
      });

      expect(result.success).toBe(true);
      const clonedId = result.blockId!;
      const cloned = result.newContent!.blocks[clonedId];
      expect(cloned.children).toHaveLength(2);
      // Children should have new IDs, not the originals
      expect(cloned.children).not.toContain('text-1');
      expect(cloned.children).not.toContain('text-2');
      // All new children should exist
      for (const cid of cloned.children!) {
        expect(result.newContent!.blocks[cid]).toBeDefined();
      }
    });

    it('fails when block does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'duplicateBlock',
        blockId: 'nope',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('reorderChildren', () => {
    it('reorders children of a parent', () => {
      const state = stateWithNestedChildren();
      const result = applyMutation(state, {
        type: 'reorderChildren',
        parentId: 'container-1',
        childIds: ['text-2', 'text-1'],
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.blocks['container-1'].children).toEqual(['text-2', 'text-1']);
    });

    it('fails when parent does not exist', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'reorderChildren',
        parentId: 'nope',
        childIds: [],
      });

      expect(result.success).toBe(false);
    });
  });

  describe('updatePageSettings', () => {
    it('merges page settings', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'updatePageSettings',
        settings: { backgroundColor: '#fff', fontFamily: 'Inter' },
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.pageSettings).toEqual({
        backgroundColor: '#fff',
        fontFamily: 'Inter',
      });
    });
  });

  describe('updateScripts', () => {
    it('stores header/footer scripts in page settings', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'updateScripts',
        scripts: { header: '<script>alert(1)</script>', footer: '<script>b</script>' },
      });

      expect(result.success).toBe(true);
      const ps = result.newContent!.pageSettings as Record<string, unknown>;
      expect(ps.headerScript).toBe('<script>alert(1)</script>');
      expect(ps.footerScript).toBe('<script>b</script>');
    });
  });

  describe('setLayoutMode', () => {
    it('changes layout mode', () => {
      const state = makeState();
      const result = applyMutation(state, {
        type: 'setLayoutMode',
        mode: 'canvas',
      });

      expect(result.success).toBe(true);
      expect(result.newContent!.layoutMode).toBe('canvas');
    });
  });

  describe('immutability', () => {
    it('does not mutate the original state', () => {
      const state = stateWithChild();
      const original = JSON.stringify(state);
      applyMutation(state, {
        type: 'updateBlockProps',
        blockId: 'child-1',
        props: { color: 'red' },
      });

      expect(JSON.stringify(state)).toBe(original);
    });
  });
});

// ---------------------------------------------------------------------------
// applyMutations tests
// ---------------------------------------------------------------------------

describe('applyMutations', () => {
  beforeEach(() => {
    resetIdCounter();
  });

  it('applies multiple mutations sequentially', () => {
    const state = makeState();
    const mutations: EditorMutation[] = [
      { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'a', props: { content: 'A' } },
      { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'b', props: { content: 'B' } },
    ];

    const { content, results } = applyMutations(state, mutations);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    expect(content.blocks['root-1'].children).toEqual(['a', 'b']);
  });

  it('stops on first failure', () => {
    const state = makeState();
    const mutations: EditorMutation[] = [
      { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'a' },
      { type: 'removeBlock', blockId: 'nonexistent' },
      { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'c' },
    ];

    const { results } = applyMutations(state, mutations);
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateMutation tests
// ---------------------------------------------------------------------------

describe('validateMutation', () => {
  describe('insertBlock', () => {
    it('rejects invalid block type', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: 'root-1',
        blockType: 'superWidget',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid block type');
    });

    it('rejects non-existent parent', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: 'missing',
        blockType: 'text',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('rejects non-container parent', () => {
      const state = stateWithChild();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: 'child-1',
        blockType: 'text',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a container');
    });

    it('rejects duplicate blockId', () => {
      const state = stateWithChild();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: 'root-1',
        blockType: 'text',
        blockId: 'child-1',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('already exists');
    });

    it('accepts valid insertBlock', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: 'root-1',
        blockType: 'text',
      });

      expect(result.valid).toBe(true);
    });

    it('accepts null parentId', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'insertBlock',
        parentId: null,
        blockType: 'text',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('moveBlock', () => {
    it('rejects circular move (block into its own child)', () => {
      // Use a state where the target parent is a container descendant
      const state: EditorContentJson = {
        root: 'root-1',
        blocks: {
          'root-1': { id: 'root-1', type: 'section', children: ['outer'] },
          'outer': { id: 'outer', type: 'container', children: ['inner'] },
          'inner': { id: 'inner', type: 'container', children: [] },
        },
        layoutMode: 'fluid',
      };
      const result = validateMutation(state, {
        type: 'moveBlock',
        blockId: 'outer',
        parentId: 'inner',
        index: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('descendant');
    });

    it('rejects moving into self', () => {
      const state = stateWithNestedChildren();
      const result = validateMutation(state, {
        type: 'moveBlock',
        blockId: 'container-1',
        parentId: 'container-1',
        index: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('descendant');
    });

    it('rejects non-container target parent', () => {
      const state = stateWithNestedChildren();
      const result = validateMutation(state, {
        type: 'moveBlock',
        blockId: 'text-1',
        parentId: 'text-2',
        index: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not a container');
    });

    it('rejects missing block', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'moveBlock',
        blockId: 'nope',
        parentId: 'root-1',
        index: 0,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('accepts valid move', () => {
      const state: EditorContentJson = {
        root: 'root-1',
        blocks: {
          'root-1': { id: 'root-1', type: 'section', children: ['container-a', 'container-b'] },
          'container-a': { id: 'container-a', type: 'container', children: ['text-1'] },
          'container-b': { id: 'container-b', type: 'container', children: [] },
          'text-1': { id: 'text-1', type: 'text', children: [] },
        },
        layoutMode: 'fluid',
      };

      const result = validateMutation(state, {
        type: 'moveBlock',
        blockId: 'text-1',
        parentId: 'container-b',
        index: 0,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('reorderChildren', () => {
    it('rejects non-existent parent', () => {
      const state = makeState();
      const result = validateMutation(state, {
        type: 'reorderChildren',
        parentId: 'nope',
        childIds: [],
      });

      expect(result.valid).toBe(false);
    });

    it('rejects non-existent child IDs', () => {
      const state = stateWithNestedChildren();
      const result = validateMutation(state, {
        type: 'reorderChildren',
        parentId: 'container-1',
        childIds: ['text-1', 'ghost'],
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('ghost');
    });
  });

  describe('setLayoutMode', () => {
    it('rejects invalid mode', () => {
      const result = validateMutation(makeState(), {
        type: 'setLayoutMode',
        mode: 'invalid' as 'fluid',
      });

      expect(result.valid).toBe(false);
    });

    it('accepts valid mode', () => {
      const result = validateMutation(makeState(), {
        type: 'setLayoutMode',
        mode: 'canvas',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('simple block-existence checks', () => {
    const blockMutations: EditorMutation[] = [
      { type: 'updateBlockProps', blockId: 'nope', props: {} },
      { type: 'removeBlock', blockId: 'nope' },
      { type: 'replaceText', blockId: 'nope', content: '' },
      { type: 'duplicateBlock', blockId: 'nope' },
    ];

    for (const mutation of blockMutations) {
      it(`rejects ${mutation.type} when block does not exist`, () => {
        const result = validateMutation(makeState(), mutation);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('not found');
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Transaction tests
// ---------------------------------------------------------------------------

describe('createTransaction', () => {
  beforeEach(() => {
    resetTxnCounter();
  });

  it('creates a transaction with a unique ID', () => {
    const txn = createTransaction(
      [{ type: 'insertBlock', parentId: 'root-1', blockType: 'text' }],
      'user',
      'Added text block',
    );

    expect(txn.id).toMatch(/^txn_\d+_\d+$/);
    expect(txn.mutations).toHaveLength(1);
    expect(txn.source).toBe('user');
    expect(txn.description).toBe('Added text block');
    expect(txn.timestamp).toBeGreaterThan(0);
  });
});

describe('executeTransaction', () => {
  beforeEach(() => {
    resetIdCounter();
    resetTxnCounter();
  });

  it('applies all mutations in a transaction', () => {
    const state = makeState();
    const txn = createTransaction(
      [
        { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'a' },
        { type: 'insertBlock', parentId: 'root-1', blockType: 'button', blockId: 'b' },
      ],
      'ai',
      'AI added blocks',
    );

    const { content, results, transaction } = executeTransaction(state, txn);
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.success)).toBe(true);
    expect(content.blocks['a']).toBeDefined();
    expect(content.blocks['b']).toBeDefined();
    expect(transaction.id).toBe(txn.id);
  });

  it('returns original state when validation fails', () => {
    const state = makeState();
    const txn = createTransaction(
      [
        { type: 'insertBlock', parentId: 'root-1', blockType: 'text', blockId: 'a' },
        { type: 'removeBlock', blockId: 'nonexistent' },
      ],
      'user',
    );

    const { content, results } = executeTransaction(state, txn);
    // State should not have 'a' because the transaction failed partway
    // The first mutation was applied but then the second failed, so we get original state back
    expect(results.some((r) => !r.success)).toBe(true);
    // The returned content is the original state for the failed mutation
    expect(content).toEqual(state);
  });

  it('validates mutations before applying them', () => {
    const state = makeState();
    const txn = createTransaction(
      [{ type: 'insertBlock', parentId: 'root-1', blockType: 'notARealType' }],
      'system',
    );

    const { results } = executeTransaction(state, txn);
    expect(results[0].success).toBe(false);
    expect(results[0].error).toContain('Invalid block type');
  });
});

// ---------------------------------------------------------------------------
// PatchHistory tests
// ---------------------------------------------------------------------------

describe('PatchHistory', () => {
  let history: PatchHistory;

  beforeEach(() => {
    history = new PatchHistory();
  });

  it('starts with no undo/redo', () => {
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undoCount).toBe(0);
    expect(history.redoCount).toBe(0);
  });

  it('supports undo after push', () => {
    const before = makeState();
    const after: EditorContentJson = {
      ...before,
      blocks: {
        ...before.blocks,
        'new-1': { id: 'new-1', type: 'text', children: [] },
      },
    };

    history.push('txn_1', before, after);

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    const undone = history.undo(after);
    expect(undone).not.toBeNull();
    expect(undone!.txnId).toBe('txn_1');
    expect(undone!.state).toEqual(before);

    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(true);
  });

  it('supports redo after undo', () => {
    const before = makeState();
    const after: EditorContentJson = {
      ...before,
      layoutMode: 'canvas',
    };

    history.push('txn_1', before, after);
    history.undo(after);

    const redone = history.redo(before);
    expect(redone).not.toBeNull();
    expect(redone!.txnId).toBe('txn_1');
    expect(redone!.state).toEqual(after);

    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);
  });

  it('clears redo stack on new push', () => {
    const s1 = makeState();
    const s2: EditorContentJson = { ...s1, layoutMode: 'canvas' };
    const s3: EditorContentJson = { ...s1, layoutMode: 'fluid' };

    history.push('txn_1', s1, s2);
    history.undo(s2);
    expect(history.canRedo).toBe(true);

    // Push a new mutation — should clear redo
    history.push('txn_2', s1, s3);
    expect(history.canRedo).toBe(false);
    // Undo popped 1 entry (stack=0), then push added 1 entry (stack=1)
    expect(history.undoCount).toBe(1);
  });

  it('returns null from undo when stack is empty', () => {
    const result = history.undo(makeState());
    expect(result).toBeNull();
  });

  it('returns null from redo when stack is empty', () => {
    const result = history.redo(makeState());
    expect(result).toBeNull();
  });

  it('enforces max history of 100', () => {
    const base = makeState();
    for (let i = 0; i < 110; i++) {
      history.push(`txn_${i}`, base, base);
    }

    expect(history.undoCount).toBe(100);
  });

  it('supports multiple undo/redo cycles', () => {
    const s0 = makeState();
    const s1: EditorContentJson = { ...s0, layoutMode: 'canvas' };
    const s2: EditorContentJson = {
      ...s1,
      blocks: { ...s1.blocks, 'x': { id: 'x', type: 'text', children: [] } },
    };

    history.push('txn_1', s0, s1);
    history.push('txn_2', s1, s2);

    // Undo txn_2
    const u1 = history.undo(s2);
    expect(u1!.txnId).toBe('txn_2');
    expect(u1!.state).toEqual(s1);

    // Undo txn_1
    const u2 = history.undo(s1);
    expect(u2!.txnId).toBe('txn_1');
    expect(u2!.state).toEqual(s0);

    // Redo txn_1
    const r1 = history.redo(s0);
    expect(r1!.txnId).toBe('txn_1');
    expect(r1!.state).toEqual(s1);

    // Redo txn_2
    const r2 = history.redo(s1);
    expect(r2!.txnId).toBe('txn_2');
    expect(r2!.state).toEqual(s2);
  });

  it('clear() empties both stacks', () => {
    const base = makeState();
    history.push('txn_1', base, base);
    history.push('txn_2', base, base);
    history.undo(base);

    history.clear();
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
  });
});
