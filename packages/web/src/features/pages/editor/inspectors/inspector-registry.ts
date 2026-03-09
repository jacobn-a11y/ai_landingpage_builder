/**
 * Registry for per-block-type inspector components.
 * Each block type can register a React component that renders
 * its specific property controls in the properties panel.
 */

import type { ComponentType } from 'react';
import type { EditorBlock } from '../types';

export interface InspectorProps {
  blockId: string;
  block: EditorBlock;
  updateBlock: (id: string, updates: Partial<EditorBlock>) => void;
}

const registry = new Map<string, ComponentType<InspectorProps>>();

export function registerInspector(
  type: string,
  component: ComponentType<InspectorProps>,
): void {
  registry.set(type, component);
}

export function getInspector(
  type: string,
): ComponentType<InspectorProps> | undefined {
  return registry.get(type);
}

export function hasInspector(type: string): boolean {
  return registry.has(type);
}
