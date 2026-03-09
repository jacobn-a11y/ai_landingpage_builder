import { describe, expect, it } from 'vitest';
import { EditorCanvas } from './EditorCanvas';
import { PropertiesPanel } from './PropertiesPanel';
import { AiWorkspacePanel } from './AiWorkspacePanel';

describe('editor component exports', () => {
  it('exports core editor components', () => {
    expect(typeof EditorCanvas).toBe('function');
    expect(typeof PropertiesPanel).toBe('function');
    expect(typeof AiWorkspacePanel).toBe('function');
  });
});
