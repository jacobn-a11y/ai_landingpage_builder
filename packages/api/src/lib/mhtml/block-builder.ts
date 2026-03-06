/**
 * Block Builder — the main orchestrator that converts analyzed DOM snapshots
 * into editor-compatible PageContentJson using a tiered strategy.
 *
 * Tier A (default): Layout-preserving blocks with scoped CSS
 * Tier B: Semantic pattern blocks (only when passing fidelity gate)
 * Tier C: Isolated HTML with token handles
 * Tier D: Locked render
 */

import { randomUUID } from 'crypto';
import type { ElementSnapshot, PageSnapshot } from './extract-snapshot.js';
import type { DetectedSection, SectionType } from './section-detector.js';
import type { DetectedLayout } from './layout-detector.js';
import type { DetectedPattern, PatternType } from './pattern-detector.js';
import { detectLayout } from './layout-detector.js';
import { detectPatterns } from './pattern-detector.js';
import { analyzeSpecialElements, type SpecialElementResult } from './special-elements.js';
import { createScopedFragment, type ScopedStyleFragment } from './scoped-css.js';

// --- Types ---

interface BaseBlock {
  id: string;
  type: string;
  children?: string[];
  props?: Record<string, unknown>;
}

interface PageContentJson {
  root: string;
  blocks: Record<string, BaseBlock>;
}

export interface ImportMeta {
  tier: 'A' | 'B' | 'C' | 'D';
  sectionType: SectionType;
  sectionIndex: number;
  reasonCodes: string[];
  importSchemaVersion: number;
  blockSchemaVersion: number;
  importerVersion: string;
  // Tier C specific
  tokens?: TokenDef[];
  htmlPayloadVersion?: number;
}

export interface TokenDef {
  id: string;
  type: 'text' | 'image' | 'link';
  selector: string;
  current: string | { href: string; text: string };
}

export interface BlockBuildResult {
  content: PageContentJson;
  scopedStyles: ScopedStyleFragment[];
  stats: {
    sectionsDetected: number;
    blocksCreated: number;
    tierA: number;
    tierB: number;
    tierC: number;
    tierD: number;
  };
  provenance: ProvenanceEntry[];
}

export interface ProvenanceEntry {
  blockId: string;
  sourceNodeIds: string[];
  tier: 'A' | 'B' | 'C' | 'D';
  reason: string;
}

// --- Constants ---

const IMPORTER_VERSION = '1.0.0';
const IMPORT_SCHEMA_VERSION = 1;
const BLOCK_SCHEMA_VERSION = 1;

// Universal props that the editor supports natively
const UNIVERSAL_STYLE_PROPS: Record<string, string> = {
  'margin-top': 'marginTop',
  'margin-right': 'marginRight',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  'background-color': 'backgroundColor',
  'border-radius': 'borderRadius',
  'border-top-left-radius': 'borderTopLeftRadius',
  'border-top-right-radius': 'borderTopRightRadius',
  'border-bottom-left-radius': 'borderBottomLeftRadius',
  'border-bottom-right-radius': 'borderBottomRightRadius',
  'border-width': 'borderWidth',
  'border-color': 'borderColor',
  'width': 'width',
  'max-width': 'maxWidth',
  'min-width': 'minWidth',
};

// --- ID Generation ---

function generateBlockId(prefix: string = 'imp'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `b_${ts}_${rand}`;
}

// --- CSS to Props Mapping ---

function cssToUniversalProps(style: Record<string, string>): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const [cssProp, blockProp] of Object.entries(UNIVERSAL_STYLE_PROPS)) {
    // Convert camelCase CSS prop names to kebab-case for lookup
    const kebab = cssProp;
    const camel = cssProp.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    const value = style[camel] || style[kebab];
    if (!value || value === '0px' || value === 'auto' || value === 'none') continue;

    // Parse pixel values
    if (value.endsWith('px')) {
      const num = parseFloat(value);
      if (!isNaN(num) && num !== 0) {
        props[blockProp] = num;
      }
    } else if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      props[blockProp] = normalizeColor(value);
    } else if (value.endsWith('%')) {
      props[blockProp] = value;
    }
  }

  return props;
}

/**
 * Normalize color values to rgba format.
 */
function normalizeColor(value: string): string {
  // Already in standard format, pass through
  // In production, this would parse and normalize to rgba
  return value;
}

/**
 * Extract CSS properties that can't be mapped to UniversalProps.
 * These become scoped CSS for Tier A blocks.
 */
function extractExtraCss(style: Record<string, string>): string {
  const extraProps: string[] = [];
  const universalKeys = new Set(Object.values(UNIVERSAL_STYLE_PROPS).map((v) =>
    v.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase()),
  ));

  // Properties that are interesting for visual fidelity
  const importantProps = [
    'font-family', 'font-size', 'font-weight', 'font-style',
    'line-height', 'letter-spacing', 'text-align', 'text-transform',
    'text-decoration', 'color', 'background-image', 'background-size',
    'background-position', 'background-repeat', 'box-shadow', 'text-shadow',
    'opacity', 'border-top-width', 'border-right-width', 'border-bottom-width',
    'border-left-width', 'border-top-style', 'border-right-style',
    'border-bottom-style', 'border-left-style', 'border-top-color',
    'border-right-color', 'border-bottom-color', 'border-left-color',
  ];

  for (const prop of importantProps) {
    const camel = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = style[camel] || style[prop];
    if (!value || value === 'initial' || value === 'normal' || value === 'none' || value === '0px') continue;
    if (universalKeys.has(prop)) continue;
    extraProps.push(`  ${prop}: ${value};`);
  }

  return extraProps.length > 0 ? `{\n${extraProps.join('\n')}\n}` : '';
}

// --- Block Construction ---

function buildTextBlock(
  el: ElementSnapshot,
  allElements: ElementSnapshot[],
): BaseBlock {
  // Collect all text content from the subtree
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  function collectHtml(element: ElementSnapshot): string {
    let html = '';
    if (element.textContent) {
      // Wrap in appropriate inline tags
      const style = element.computedStyle;
      let text = element.textContent;
      if (style.fontWeight && parseInt(style.fontWeight) >= 700) {
        text = `<strong>${text}</strong>`;
      }
      if (style.fontStyle === 'italic') {
        text = `<em>${text}</em>`;
      }
      html += text;
    }
    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) {
        if (child.tagName === 'br') {
          html += '<br>';
        } else if (child.tagName === 'a' && child.attributes.href) {
          html += `<a href="${child.attributes.href}">${collectHtml(child)}</a>`;
        } else {
          html += collectHtml(child);
        }
      }
    }
    return html;
  }

  const contentHtml = collectHtml(el);
  const universalProps = cssToUniversalProps(el.computedStyle);

  // Determine heading level
  const tag = el.tagName;
  let textTag = 'p';
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    textTag = tag;
  }

  return {
    id: generateBlockId(),
    type: 'text',
    props: {
      ...universalProps,
      contentHtml: `<${textTag}>${contentHtml}</${textTag}>`,
      tag: textTag,
    },
  };
}

function buildImageBlock(el: ElementSnapshot): BaseBlock {
  const universalProps = cssToUniversalProps(el.computedStyle);
  return {
    id: generateBlockId(),
    type: 'image',
    props: {
      ...universalProps,
      src: el.attributes.src || '',
      alt: el.attributes.alt || '',
    },
  };
}

function buildButtonBlock(el: ElementSnapshot, allElements: ElementSnapshot[]): BaseBlock {
  const universalProps = cssToUniversalProps(el.computedStyle);
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  function getText(element: ElementSnapshot): string {
    let text = element.textContent || '';
    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) text += getText(child);
    }
    return text;
  }

  return {
    id: generateBlockId(),
    type: 'button',
    props: {
      ...universalProps,
      text: getText(el).trim(),
      href: el.attributes.href || '',
    },
  };
}

function buildDividerBlock(): BaseBlock {
  return {
    id: generateBlockId(),
    type: 'divider',
    props: {},
  };
}

// --- Tier C: Token Map Builder ---

function buildTierCTokens(
  el: ElementSnapshot,
  allElements: ElementSnapshot[],
): TokenDef[] {
  const tokens: TokenDef[] = [];
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  function scan(element: ElementSnapshot, depth: number): void {
    if (depth > 20) return;

    // Text tokens: elements with direct text content
    if (element.textContent && element.textContent.length > 2) {
      tokens.push({
        id: `tok_${randomUUID().slice(0, 8)}`,
        type: 'text',
        selector: `[data-import-id="${element.importId}"]`,
        current: element.textContent,
      });
    }

    // Image tokens
    if (element.tagName === 'img' && element.attributes.src) {
      tokens.push({
        id: `tok_${randomUUID().slice(0, 8)}`,
        type: 'image',
        selector: `[data-import-id="${element.importId}"]`,
        current: element.attributes.src,
      });
    }

    // Link tokens
    if (element.tagName === 'a' && element.attributes.href) {
      const text = element.textContent || '';
      tokens.push({
        id: `tok_${randomUUID().slice(0, 8)}`,
        type: 'link',
        selector: `[data-import-id="${element.importId}"]`,
        current: { href: element.attributes.href, text },
      });
    }

    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) scan(child, depth + 1);
    }
  }

  scan(el, 0);
  return tokens;
}

// --- Main Block Builder ---

/**
 * Convert a section's elements into editor blocks.
 */
function buildSectionBlocks(
  section: DetectedSection,
  sectionIndex: number,
  allElements: ElementSnapshot[],
  scopedStyles: ScopedStyleFragment[],
  provenance: ProvenanceEntry[],
): { sectionBlock: BaseBlock; childBlocks: BaseBlock[] } {
  const blocks: BaseBlock[] = [];
  const rootEl = section.rootElement;
  const sectionElements = section.elements;

  // Detect patterns within this section
  const patterns = detectPatterns(sectionElements, allElements);

  // Detect special elements
  const specialElements = analyzeSpecialElements(sectionElements, allElements);
  const specialSet = new Set(specialElements.map((s) => s.element.importId));

  // Determine overall tier for this section
  let tier: 'A' | 'B' | 'C' | 'D' = 'A';
  const reasonCodes: string[] = [];

  // Check for complex patterns that push to Tier C
  const hasComplexPseudo = sectionElements.some((el) => el.pseudoBefore || el.pseudoAfter);
  const hasLayerHazards = sectionElements.some(
    (el) => el.computedStyle.position === 'absolute' && el.depth > 1,
  );

  if (hasComplexPseudo && hasLayerHazards) {
    tier = 'C';
    reasonCodes.push('COMPLEX_PSEUDO_AND_LAYERS');
  }

  // Check if patterns suggest Tier B
  const highConfPattern = patterns.find((p) => p.confidence >= 0.6 && p.tierBCandidate);
  if (highConfPattern && tier === 'A') {
    tier = 'B';
    reasonCodes.push(`PATTERN_${highConfPattern.type.toUpperCase()}`);
  }

  // Build the import meta
  const importMeta: ImportMeta = {
    tier,
    sectionType: section.semanticType,
    sectionIndex,
    reasonCodes,
    importSchemaVersion: IMPORT_SCHEMA_VERSION,
    blockSchemaVersion: BLOCK_SCHEMA_VERSION,
    importerVersion: IMPORTER_VERSION,
  };

  // === Build blocks based on tier ===

  if (tier === 'C' || tier === 'D') {
    // Tier C/D: wrap entire section as customHtml
    const tokens = tier === 'C' ? buildTierCTokens(rootEl, allElements) : undefined;
    if (tokens) importMeta.tokens = tokens;
    importMeta.htmlPayloadVersion = 1;

    // Reconstruct minimal HTML from element data
    const htmlContent = reconstructHtml(rootEl, allElements);

    const block: BaseBlock = {
      id: generateBlockId(),
      type: 'customHtml',
      props: {
        html: htmlContent,
        _importMeta: importMeta,
      },
    };

    provenance.push({
      blockId: block.id,
      sourceNodeIds: sectionElements.map((e) => e.importId),
      tier,
      reason: reasonCodes.join(', '),
    });

    return { sectionBlock: block, childBlocks: [] };
  }

  // Tier A or B: build structured blocks
  const layout = detectLayout(rootEl, allElements);
  const sectionBlockId = generateBlockId();
  const containerBlockId = generateBlockId();
  const childBlockIds: string[] = [];

  // Build child blocks based on layout
  if (layout.type === 'columns' && layout.children.length >= 2) {
    // Columns layout
    const columnsBlockId = generateBlockId();
    const columnChildIds: string[] = [];

    for (const child of layout.children) {
      const childBlock = buildElementBlock(child, allElements, scopedStyles, provenance, tier, section, sectionIndex, blocks);
      blocks.push(childBlock);
      columnChildIds.push(childBlock.id);
    }

    const columnsBlock: BaseBlock = {
      id: columnsBlockId,
      type: 'columns',
      children: columnChildIds,
      props: {
        ...cssToUniversalProps(rootEl.computedStyle),
        columns: layout.columnWidths || layout.children.map(() => '1fr'),
        gap: layout.gap || 0,
      },
    };
    blocks.push(columnsBlock);
    childBlockIds.push(columnsBlockId);
  } else if (layout.type === 'grid') {
    // Grid layout
    const gridBlockId = generateBlockId();
    const gridChildIds: string[] = [];

    for (const child of layout.children) {
      const childBlock = buildElementBlock(child, allElements, scopedStyles, provenance, tier, section, sectionIndex, blocks);
      blocks.push(childBlock);
      gridChildIds.push(childBlock.id);
    }

    const gridBlock: BaseBlock = {
      id: gridBlockId,
      type: 'grid',
      children: gridChildIds,
      props: {
        ...cssToUniversalProps(rootEl.computedStyle),
        gridTemplateColumns: layout.gridTemplate?.cols || 'auto',
      },
    };
    blocks.push(gridBlock);
    childBlockIds.push(gridBlockId);
  } else {
    // Stack layout (default)
    const elementMap = new Map(allElements.map((e) => [e.importId, e]));
    const directChildren = rootEl.childImportIds
      .map((id) => elementMap.get(id))
      .filter((el): el is ElementSnapshot => el !== undefined && el.isVisible);

    for (const child of directChildren) {
      const childBlock = buildElementBlock(child, allElements, scopedStyles, provenance, tier, section, sectionIndex, blocks);
      blocks.push(childBlock);
      childBlockIds.push(childBlock.id);
    }
  }

  // Container block
  const containerBlock: BaseBlock = {
    id: containerBlockId,
    type: 'container',
    children: childBlockIds,
    props: {
      ...cssToUniversalProps(rootEl.computedStyle),
      maxWidth: '1200px',
    },
  };
  blocks.push(containerBlock);

  // Section block
  const sectionBlock: BaseBlock = {
    id: sectionBlockId,
    type: 'section',
    children: [containerBlockId],
    props: {
      ...cssToUniversalProps(rootEl.computedStyle),
      _importMeta: importMeta,
    },
  };

  // Generate scoped CSS for extra styling
  const extraCss = extractExtraCss(rootEl.computedStyle);
  if (extraCss) {
    const fragment = createScopedFragment(sectionBlockId, `.import-section ${extraCss}`);
    scopedStyles.push(fragment);
  }

  provenance.push({
    blockId: sectionBlockId,
    sourceNodeIds: sectionElements.map((e) => e.importId),
    tier,
    reason: reasonCodes.join(', '),
  });

  return { sectionBlock, childBlocks: blocks };
}

/**
 * Build a block for a single element.
 * All nested blocks are collected into `collectedBlocks` for flat registration.
 */
function buildElementBlock(
  el: ElementSnapshot,
  allElements: ElementSnapshot[],
  scopedStyles: ScopedStyleFragment[],
  provenance: ProvenanceEntry[],
  tier: 'A' | 'B',
  section: DetectedSection,
  sectionIndex: number,
  collectedBlocks: BaseBlock[],
): BaseBlock {
  const tag = el.tagName;

  // Image
  if (tag === 'img') {
    return buildImageBlock(el);
  }

  // Heading or paragraph with text
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label'].includes(tag) && el.textContent) {
    return buildTextBlock(el, allElements);
  }

  // Button/link
  if ((tag === 'a' || tag === 'button') && el.textContent) {
    return buildButtonBlock(el, allElements);
  }

  // Horizontal rule
  if (tag === 'hr') {
    return buildDividerBlock();
  }

  // Container-like element with children: recurse
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));
  const visibleChildren = el.childImportIds
    .map((id) => elementMap.get(id))
    .filter((child): child is ElementSnapshot => child !== undefined && child.isVisible);

  if (visibleChildren.length > 0) {
    const layout = detectLayout(el, allElements);
    const childIds: string[] = [];

    for (const child of visibleChildren) {
      const childBlock = buildElementBlock(child, allElements, scopedStyles, provenance, tier, section, sectionIndex, collectedBlocks);
      collectedBlocks.push(childBlock);
      childIds.push(childBlock.id);
    }

    const stackBlock: BaseBlock = {
      id: generateBlockId(),
      type: layout.type === 'columns' ? 'columns' : 'stack',
      children: childIds,
      props: {
        ...cssToUniversalProps(el.computedStyle),
        ...(layout.type === 'columns' ? { columns: layout.columnWidths } : {}),
      },
    };

    return stackBlock;
  }

  // Leaf element with text content
  if (el.textContent) {
    return buildTextBlock(el, allElements);
  }

  // Spacer for empty elements with height
  if (el.boundingBox.height > 10) {
    return {
      id: generateBlockId(),
      type: 'spacer',
      props: { height: Math.round(el.boundingBox.height) },
    };
  }

  // Fallback: empty stack
  return {
    id: generateBlockId(),
    type: 'stack',
    children: [],
    props: {},
  };
}

/**
 * Reconstruct minimal HTML from an element snapshot for Tier C/D.
 */
function reconstructHtml(el: ElementSnapshot, allElements: ElementSnapshot[]): string {
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  function render(element: ElementSnapshot, depth: number): string {
    if (depth > 30) return '';

    const attrs = Object.entries(element.attributes)
      .map(([k, v]) => `${k}="${v.replace(/"/g, '&quot;')}"`)
      .join(' ');

    const tag = element.tagName;
    const voidTags = new Set(['img', 'br', 'hr', 'input', 'meta', 'link']);

    if (voidTags.has(tag)) {
      return `<${tag}${attrs ? ' ' + attrs : ''} />`;
    }

    let children = '';
    if (element.textContent) children += element.textContent;
    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) children += render(child, depth + 1);
    }

    return `<${tag}${attrs ? ' ' + attrs : ''}>${children}</${tag}>`;
  }

  return render(el, 0);
}

// --- Main Entry Point ---

/**
 * Build editor blocks from page snapshot and detected sections.
 */
export function buildBlocks(
  snapshot: PageSnapshot,
  sections: DetectedSection[],
): BlockBuildResult {
  const allElements = snapshot.elements;
  const blocks: Record<string, BaseBlock> = {};
  const scopedStyles: ScopedStyleFragment[] = [];
  const provenance: ProvenanceEntry[] = [];
  const sectionBlockIds: string[] = [];

  let stats = { sectionsDetected: sections.length, blocksCreated: 0, tierA: 0, tierB: 0, tierC: 0, tierD: 0 };

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const { sectionBlock, childBlocks } = buildSectionBlocks(
      section, i, allElements, scopedStyles, provenance,
    );

    // Add section block
    blocks[sectionBlock.id] = sectionBlock;
    sectionBlockIds.push(sectionBlock.id);

    // Add child blocks
    for (const block of childBlocks) {
      blocks[block.id] = block;
    }

    // Update stats
    const meta = (sectionBlock.props?._importMeta as ImportMeta);
    if (meta) {
      switch (meta.tier) {
        case 'A': stats.tierA++; break;
        case 'B': stats.tierB++; break;
        case 'C': stats.tierC++; break;
        case 'D': stats.tierD++; break;
      }
    }
  }

  // Create root block
  const rootId = generateBlockId();
  blocks[rootId] = {
    id: rootId,
    type: 'stack',
    children: sectionBlockIds,
    props: {},
  };

  stats.blocksCreated = Object.keys(blocks).length;

  return {
    content: { root: rootId, blocks },
    scopedStyles,
    stats,
    provenance,
  };
}
