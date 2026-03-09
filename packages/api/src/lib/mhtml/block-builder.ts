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
  // Spacing
  'margin-top': 'marginTop',
  'margin-right': 'marginRight',
  'margin-bottom': 'marginBottom',
  'margin-left': 'marginLeft',
  'padding-top': 'paddingTop',
  'padding-right': 'paddingRight',
  'padding-bottom': 'paddingBottom',
  'padding-left': 'paddingLeft',
  // Background
  'background-color': 'backgroundColor',
  // Borders
  'border-radius': 'borderRadius',
  'border-top-left-radius': 'borderTopLeftRadius',
  'border-top-right-radius': 'borderTopRightRadius',
  'border-bottom-left-radius': 'borderBottomLeftRadius',
  'border-bottom-right-radius': 'borderBottomRightRadius',
  'border-width': 'borderWidth',
  'border-color': 'borderColor',
  'border-style': 'borderStyle',
  'border-top-width': 'borderTopWidth',
  'border-right-width': 'borderRightWidth',
  'border-bottom-width': 'borderBottomWidth',
  'border-left-width': 'borderLeftWidth',
  // Sizing
  'width': 'width',
  'max-width': 'maxWidth',
  'min-width': 'minWidth',
  // Typography
  'font-family': 'fontFamily',
  'font-size': 'fontSize',
  'font-weight': 'fontWeight',
  'line-height': 'lineHeight',
  'letter-spacing': 'letterSpacing',
  'text-align': 'textAlign',
  'text-transform': 'textTransform',
  'color': 'color',
  // Visual
  'opacity': 'opacity',
  'box-shadow': 'boxShadow',
  'object-fit': 'objectFit',
};

// --- ID Generation ---

function generateBlockId(prefix: string = 'imp'): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8);
  return `b_${ts}_${rand}`;
}

// --- CSS to Props Mapping ---

// Props that should be skipped when value is trivial
const SKIP_VALUES = new Set(['0px', 'auto', 'none', 'initial', 'inherit', 'normal', 'unset', '0']);
// Props that accept string values as-is (not just px/color/%)
const STRING_PROPS = new Set([
  'fontFamily', 'textAlign', 'textTransform', 'borderStyle', 'boxShadow', 'objectFit',
]);
// Props that accept unitless numeric values
const UNITLESS_PROPS = new Set(['opacity', 'fontWeight', 'lineHeight']);

function cssToUniversalProps(style: Record<string, string>): Record<string, unknown> {
  const props: Record<string, unknown> = {};

  for (const [cssProp, blockProp] of Object.entries(UNIVERSAL_STYLE_PROPS)) {
    const camel = cssProp.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const value = style[camel] || style[cssProp];
    if (!value || SKIP_VALUES.has(value)) continue;

    // Skip transparent/invisible backgrounds
    if (blockProp === 'backgroundColor' && (value === 'transparent' || value === 'rgba(0, 0, 0, 0)')) continue;

    // Pixel values → numeric
    if (value.endsWith('px')) {
      const num = parseFloat(value);
      if (!isNaN(num) && num !== 0) {
        props[blockProp] = num;
      }
    }
    // Colors
    else if (value.startsWith('#') || value.startsWith('rgb') || value.startsWith('hsl')) {
      props[blockProp] = normalizeColor(value);
    }
    // Percentages
    else if (value.endsWith('%')) {
      props[blockProp] = value;
    }
    // Unitless numeric (opacity, fontWeight, lineHeight)
    else if (UNITLESS_PROPS.has(blockProp)) {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        props[blockProp] = num;
      }
    }
    // em/rem values (letter-spacing, etc.)
    else if (value.endsWith('em') || value.endsWith('rem')) {
      props[blockProp] = value;
    }
    // String values (font-family, text-align, box-shadow, etc.)
    else if (STRING_PROPS.has(blockProp)) {
      props[blockProp] = value;
    }
    // Font-size can be keyword (small, medium, large, etc.)
    else if (blockProp === 'fontSize' && /^[a-z-]+$/.test(value)) {
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

  // Properties that are interesting for visual fidelity but not in universal props
  const importantProps = [
    'font-style', 'text-decoration', 'text-shadow',
    'background-image', 'background-size', 'background-position', 'background-repeat',
    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'border-right-width', 'border-bottom-width', 'border-left-width',
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
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  function collectHtml(element: ElementSnapshot): string {
    let html = '';
    if (element.textContent) {
      const style = element.computedStyle;
      let text = element.textContent;
      if (style.fontWeight && parseInt(style.fontWeight) >= 700) {
        text = `<strong>${text}</strong>`;
      }
      if (style.fontStyle === 'italic') {
        text = `<em>${text}</em>`;
      }
      if (style.textDecoration?.includes('underline')) {
        text = `<u>${text}</u>`;
      }
      if (style.textDecoration?.includes('line-through')) {
        text = `<s>${text}</s>`;
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
        } else if (child.tagName === 'li') {
          html += `<li>${collectHtml(child)}</li>`;
        } else {
          html += collectHtml(child);
        }
      }
    }
    return html;
  }

  const contentHtml = collectHtml(el);
  const universalProps = cssToUniversalProps(el.computedStyle);

  // Determine heading level or list type
  const tag = el.tagName;
  let textTag = 'p';
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tag)) {
    textTag = tag;
  } else if (tag === 'ul' || tag === 'ol') {
    textTag = tag;
  }

  // Extract link color from child <a> tags
  const linkEl = el.childImportIds
    .map((id) => elementMap.get(id))
    .find((child) => child?.tagName === 'a');
  const linkColor = linkEl?.computedStyle.color;

  const props: Record<string, unknown> = {
    ...universalProps,
    contentHtml: `<${textTag}>${contentHtml}</${textTag}>`,
    tag: textTag,
  };

  if (linkColor) props.linkColor = normalizeColor(linkColor);

  return { id: generateBlockId(), type: 'text', props };
}

function buildImageBlock(el: ElementSnapshot, parentEl?: ElementSnapshot): BaseBlock {
  const universalProps = cssToUniversalProps(el.computedStyle);
  const props: Record<string, unknown> = {
    ...universalProps,
    src: el.attributes.src || el.attributes['data-src'] || '',
    alt: el.attributes.alt || '',
  };

  // Image link: if parent is <a> with href
  if (parentEl?.tagName === 'a' && parentEl.attributes.href) {
    props.href = parentEl.attributes.href;
    props.linkTarget = parentEl.attributes.target === '_blank' ? '_blank' : '_self';
  }

  // Responsive image sizing
  if (el.attributes.loading === 'lazy') props.lazyLoad = true;
  if (el.attributes.width) props.width = parseInt(el.attributes.width) || undefined;
  if (el.attributes.height) props.height = parseInt(el.attributes.height) || undefined;

  return { id: generateBlockId(), type: 'image', props };
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

  const props: Record<string, unknown> = {
    ...universalProps,
    text: getText(el).trim(),
    href: el.attributes.href || '',
  };

  // Link target
  if (el.attributes.target === '_blank') props.linkTarget = '_blank';

  // Accessibility
  if (el.attributes['aria-label']) props.ariaLabel = el.attributes['aria-label'];
  if (el.attributes.role) props.role = el.attributes.role;

  // Separate textColor from backgroundColor (color prop is text color on buttons)
  if (props.color) {
    props.textColor = props.color;
    delete props.color;
  }

  return { id: generateBlockId(), type: 'button', props };
}

function buildDividerBlock(el?: ElementSnapshot): BaseBlock {
  const props: Record<string, unknown> = {};

  if (el) {
    const style = el.computedStyle;
    // Extract border properties (HR uses border-top by default)
    const borderColor = style.borderTopColor || style.borderColor || style.color;
    if (borderColor && borderColor !== 'initial') props.color = normalizeColor(borderColor);

    const borderWidth = style.borderTopWidth || style.borderWidth;
    if (borderWidth) {
      const thickness = parseFloat(borderWidth);
      if (!isNaN(thickness) && thickness > 0) props.thickness = thickness;
    }

    const borderStyle = style.borderTopStyle || style.borderStyle;
    if (borderStyle && borderStyle !== 'none' && borderStyle !== 'initial') {
      props.lineStyle = borderStyle; // solid, dashed, dotted
    }

    // Width
    if (style.width && style.width !== 'auto') {
      props.width = style.width.endsWith('%') ? style.width : parseFloat(style.width) || undefined;
    }

    // Margin for spacing
    const universalProps = cssToUniversalProps(style);
    Object.assign(props, universalProps);
  }

  return { id: generateBlockId(), type: 'divider', props };
}

// --- Video Block Builder ---

const VIDEO_URL_PATTERNS: { provider: string; pattern: RegExp }[] = [
  { provider: 'youtube', pattern: /(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]+)/ },
  { provider: 'vimeo', pattern: /vimeo\.com\/(?:video\/)?(\d+)/ },
  { provider: 'wistia', pattern: /wistia\.(?:com|net)\/(?:medias|embed)\/([a-zA-Z0-9]+)/ },
  { provider: 'loom', pattern: /loom\.com\/(?:share|embed)\/([a-f0-9]+)/ },
];

function detectVideoProvider(url: string): { provider: string; videoId: string } | null {
  for (const { provider, pattern } of VIDEO_URL_PATTERNS) {
    const match = url.match(pattern);
    if (match) return { provider, videoId: match[1] };
  }
  return null;
}

function buildVideoBlock(el: ElementSnapshot): BaseBlock | null {
  const universalProps = cssToUniversalProps(el.computedStyle);
  const props: Record<string, unknown> = { ...universalProps };

  if (el.tagName === 'video') {
    // HTML5 <video>
    props.src = el.attributes.src || '';
    props.provider = 'html5';
    if (el.attributes.autoplay !== undefined) props.autoplay = true;
    if (el.attributes.muted !== undefined) props.muted = true;
    if (el.attributes.loop !== undefined) props.loop = true;
    if (el.attributes.poster) props.poster = el.attributes.poster;
    if (el.attributes.title) props.title = el.attributes.title;
    return { id: generateBlockId(), type: 'video', props };
  }

  if (el.tagName === 'iframe') {
    const src = el.attributes.src || el.attributes['data-src'] || '';
    const detected = detectVideoProvider(src);
    if (!detected) return null; // Not a video iframe

    props.src = src;
    props.provider = detected.provider;
    props.videoId = detected.videoId;
    if (el.attributes.title) props.title = el.attributes.title;
    // Parse autoplay from URL params
    if (src.includes('autoplay=1') || src.includes('autoplay=true')) props.autoplay = true;
    if (src.includes('mute=1') || src.includes('muted=1')) props.muted = true;
    if (src.includes('loop=1')) props.loop = true;
    return { id: generateBlockId(), type: 'video', props };
  }

  return null;
}

// --- Form Block Builder ---

const FORM_INPUT_TYPES_MAP: Record<string, string> = {
  text: 'text',
  email: 'email',
  tel: 'phone',
  phone: 'phone',
  number: 'text',
  password: 'text',
  url: 'text',
  search: 'text',
  date: 'date',
  'datetime-local': 'date',
  file: 'file',
  hidden: 'hidden',
  checkbox: 'checkbox',
  radio: 'radio',
};

function buildFormBlock(el: ElementSnapshot, allElements: ElementSnapshot[]): BaseBlock {
  const universalProps = cssToUniversalProps(el.computedStyle);
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  // Collect all form fields from the subtree
  const fields: Array<{
    id: string;
    type: string;
    name: string;
    label: string;
    placeholder: string;
    required: boolean;
    options?: string[];
  }> = [];
  let submitText = 'Submit';
  let formAction = el.attributes.action || '';
  let formMethod = el.attributes.method || 'POST';
  let fieldCounter = 0;

  function scanFormElements(element: ElementSnapshot): void {
    const tag = element.tagName;

    if (tag === 'input' && element.attributes.type !== 'submit') {
      const inputType = element.attributes.type || 'text';
      const mappedType = FORM_INPUT_TYPES_MAP[inputType] || 'text';
      const name = element.attributes.name || `field_${fieldCounter}`;
      fields.push({
        id: `ff_${fieldCounter++}`,
        type: mappedType,
        name,
        label: element.attributes['aria-label'] || '',
        placeholder: element.attributes.placeholder || '',
        required: element.attributes.required !== undefined,
        ...(mappedType === 'radio' || mappedType === 'checkbox'
          ? { options: [element.attributes.value || ''] }
          : {}),
      });
    } else if (tag === 'input' && element.attributes.type === 'submit') {
      submitText = element.attributes.value || 'Submit';
    } else if (tag === 'textarea') {
      fields.push({
        id: `ff_${fieldCounter++}`,
        type: 'textarea',
        name: element.attributes.name || `field_${fieldCounter}`,
        label: element.attributes['aria-label'] || '',
        placeholder: element.attributes.placeholder || '',
        required: element.attributes.required !== undefined,
      });
    } else if (tag === 'select') {
      const options: string[] = [];
      for (const childId of element.childImportIds) {
        const child = elementMap.get(childId);
        if (child?.tagName === 'option') {
          options.push(child.textContent || child.attributes.value || '');
        }
      }
      fields.push({
        id: `ff_${fieldCounter++}`,
        type: 'dropdown',
        name: element.attributes.name || `field_${fieldCounter}`,
        label: element.attributes['aria-label'] || '',
        placeholder: '',
        required: element.attributes.required !== undefined,
        options,
      });
    } else if (tag === 'button' && (element.attributes.type === 'submit' || !element.attributes.type)) {
      submitText = element.textContent || 'Submit';
    } else if (tag === 'label') {
      // Try to associate label with next field
      // Labels are consumed by looking at the `for` attribute or as parent
    }

    // Recurse into children
    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) scanFormElements(child);
    }
  }

  scanFormElements(el);

  // Find labels: scan for <label> elements and match via `for` attribute
  const subtree = getFormSubtree(el, elementMap);
  for (const node of subtree) {
    if (node.tagName === 'label' && node.attributes.for) {
      const forId = node.attributes.for;
      // Find the field with matching name or id
      const field = fields.find((f) => f.name === forId);
      if (field && node.textContent) {
        field.label = node.textContent.trim();
      }
    }
  }

  return {
    id: generateBlockId(),
    type: 'form',
    props: {
      ...universalProps,
      fields,
      submitText,
      formAction,
      formMethod,
    },
  };
}

function getFormSubtree(
  el: ElementSnapshot,
  elementMap: Map<string, ElementSnapshot>,
): ElementSnapshot[] {
  const result: ElementSnapshot[] = [];
  function collect(element: ElementSnapshot): void {
    result.push(element);
    for (const childId of element.childImportIds) {
      const child = elementMap.get(childId);
      if (child) collect(child);
    }
  }
  collect(el);
  return result;
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
  parentEl?: ElementSnapshot,
): BaseBlock {
  const tag = el.tagName;
  const elementMap = new Map(allElements.map((e) => [e.importId, e]));

  // Video: <video> or <iframe> with video URL
  if (tag === 'video' || tag === 'iframe') {
    const videoBlock = buildVideoBlock(el);
    if (videoBlock) return videoBlock;
    // iframe that's not a video: fall through to container/customHtml handling
  }

  // Form: native <form> elements → native form block with fields
  if (tag === 'form') {
    return buildFormBlock(el, allElements);
  }

  // Image: detect parent <a> for linked images
  if (tag === 'img') {
    return buildImageBlock(el, parentEl);
  }

  // SVG: treat as image if it has viewBox (likely an icon/illustration)
  if (tag === 'svg' && el.attributes.viewBox) {
    return {
      id: generateBlockId(),
      type: 'image',
      props: {
        ...cssToUniversalProps(el.computedStyle),
        src: '', // SVGs are inline; editor would need SVG support
        alt: el.attributes['aria-label'] || '',
        isSvg: true,
      },
    };
  }

  // Heading or paragraph with text
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'label'].includes(tag) && el.textContent) {
    return buildTextBlock(el, allElements);
  }

  // Lists
  if ((tag === 'ul' || tag === 'ol') && el.childImportIds.length > 0) {
    return buildTextBlock(el, allElements);
  }

  // Button/link — but only if it looks like a button (has text, not a nav link)
  if (tag === 'button' && el.textContent) {
    return buildButtonBlock(el, allElements);
  }
  if (tag === 'a' && el.textContent) {
    // Distinguish buttons from plain links:
    // If it has background-color, padding, or border-radius it's styled as a button
    const style = el.computedStyle;
    const hasButtonStyling =
      (style.backgroundColor && style.backgroundColor !== 'transparent' && style.backgroundColor !== 'rgba(0, 0, 0, 0)') ||
      (style.borderRadius && style.borderRadius !== '0px') ||
      (style.paddingTop && parseFloat(style.paddingTop) >= 8) ||
      style.display === 'inline-block' || style.display === 'flex';

    // If single child is an <img>, create image block with link
    const visibleChildren = el.childImportIds
      .map((id) => elementMap.get(id))
      .filter((child): child is ElementSnapshot => child !== undefined && child.isVisible);
    if (visibleChildren.length === 1 && visibleChildren[0].tagName === 'img') {
      return buildImageBlock(visibleChildren[0], el);
    }

    if (hasButtonStyling) {
      return buildButtonBlock(el, allElements);
    }
    // Plain text link: treat as text block with the link wrapped
    return buildTextBlock(el, allElements);
  }

  // Horizontal rule
  if (tag === 'hr') {
    return buildDividerBlock(el);
  }

  // Container-like element with children: recurse
  const visibleChildren = el.childImportIds
    .map((id) => elementMap.get(id))
    .filter((child): child is ElementSnapshot => child !== undefined && child.isVisible);

  if (visibleChildren.length > 0) {
    const layout = detectLayout(el, allElements);
    const childIds: string[] = [];

    for (const child of visibleChildren) {
      const childBlock = buildElementBlock(child, allElements, scopedStyles, provenance, tier, section, sectionIndex, collectedBlocks, el);
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
