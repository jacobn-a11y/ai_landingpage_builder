/**
 * Convert parsed HTML DOM to block tree (PageContentJson).
 * Maps common patterns to block types, fallback to Custom HTML.
 */

import type { BaseBlock, PageContentJson } from '@replica-pages/blocks';
import {
  parseHtml,
  getTextContent,
  looksLikeButton,
  isSectionLike,
} from './htmlParser';
import {
  generateId,
  getElementHtml,
  serializeElement,
  extractInlineStyles,
  getInnerHtml,
  hasInlineFormatting,
  isComplexHtml,
  resolveImageSrc,
} from './blockConverterUtils';

interface ConvertResult {
  block: BaseBlock;
  nested?: ConvertResult[];
}

interface ConvertOptions {
  baseUrl: string;
}

const SKIP_TAGS = new Set(['script', 'style', 'noscript', 'link', 'meta']);
const CONTAINER_TAGS = new Set(['div', 'article', 'aside', 'header', 'footer', 'main', 'nav']);

/** Shorthand: wrap raw HTML in a customHtml block. */
function customHtmlBlock(id: string, html: string): ConvertResult {
  return { block: { id, type: 'customHtml', props: { html } } };
}

/**
 * Convert a single DOM element to a block.
 * Returns null if the element should be skipped (script, style, etc.).
 */
function elementToBlock(el: Element, opts: ConvertOptions): ConvertResult | null {
  const tag = el.tagName.toLowerCase();
  if (SKIP_TAGS.has(tag)) return null;

  const id = generateId();
  const inlineStyles = extractInlineStyles(el);

  // Forms and complex elements: preserve intact as customHtml
  if (tag === 'form' || isComplexHtml(el)) {
    return customHtmlBlock(id, getElementHtml(el));
  }

  // Headings h1-h6 -> headline block type
  if (/^h[1-6]$/.test(tag)) {
    const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    const content = hasInlineFormatting(el) ? getInnerHtml(el) : getTextContent(el);
    const props: Record<string, unknown> = { text: content, level };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'headline', props },
    };
  }

  // Paragraphs -> paragraph block type
  if (tag === 'p') {
    const content = hasInlineFormatting(el) ? getInnerHtml(el) : getTextContent(el);
    if (!content) return null;
    const props: Record<string, unknown> = { text: content };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'paragraph', props },
    };
  }

  // Lists -> customHtml (preserve structure)
  if (tag === 'ul' || tag === 'ol') {
    return customHtmlBlock(id, getElementHtml(el));
  }

  // Images
  if (tag === 'img') {
    const src = el.getAttribute('src') ?? '';
    const alt = el.getAttribute('alt') ?? '';
    const resolvedSrc = resolveImageSrc(src, opts.baseUrl);
    const props: Record<string, unknown> = { src: resolvedSrc, alt };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'image', props },
    };
  }

  // Picture element -> extract img inside
  if (tag === 'picture') {
    const img = el.querySelector('img');
    if (img) return elementToBlock(img, opts);
    return null;
  }

  // Button-like anchors
  if (tag === 'a' && looksLikeButton(el)) {
    const href = el.getAttribute('href') ?? '#';
    const props: Record<string, unknown> = { text: getTextContent(el), href };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'button', props },
    };
  }

  // Standalone anchor (not button-like) -> paragraph with link
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '#';
    const text = getTextContent(el);
    if (!text) return null;
    return {
      block: {
        id,
        type: 'paragraph',
        props: { text: `<a href="${href}">${text}</a>` },
      },
    };
  }

  // Horizontal rule
  if (tag === 'hr') {
    return { block: { id, type: 'divider' } };
  }

  // Section-like containers
  if (isSectionLike(el)) {
    const nested = processChildElements(el, opts);
    if (nested.length === 0) return null;
    const props: Record<string, unknown> = {};
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: {
        id,
        type: 'section',
        children: nested.map((c) => c.block.id),
        ...(Object.keys(props).length > 0 ? { props } : {}),
      },
      nested,
    };
  }

  // Generic containers: div, article, aside, header, footer, main, nav
  if (CONTAINER_TAGS.has(tag)) {
    return convertContainer(el, id, opts, inlineStyles);
  }

  // Span with only text -> paragraph
  if (tag === 'span') {
    const text = getTextContent(el);
    if (!text) return null;
    const props: Record<string, unknown> = { text };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'paragraph', props },
    };
  }

  // Fallback: customHtml for anything else
  return customHtmlBlock(id, serializeElement(el));
}

/**
 * Convert a container element (div, article, etc.) to blocks.
 * Recurses into children if they are mappable, otherwise falls back to customHtml.
 */
function convertContainer(
  el: Element,
  id: string,
  opts: ConvertOptions,
  inlineStyles: Record<string, string> | undefined
): ConvertResult | null {
  const children = getDirectContent(el);

  // Empty container with no text content -> skip
  if (children.length === 0 && !getTextContent(el)) return null;

  // Container with only text (no child elements) -> paragraph
  if (children.length === 0 && getTextContent(el)) {
    const content = hasInlineFormatting(el) ? getInnerHtml(el) : getTextContent(el);
    const props: Record<string, unknown> = { text: content };
    if (inlineStyles) props.style = inlineStyles;
    return {
      block: { id, type: 'paragraph', props },
    };
  }

  // Try to recurse into children
  const nested = processChildElements(el, opts);
  if (nested.length === 0) return null;

  // Single child: unwrap unless the container has meaningful styles
  if (nested.length === 1 && !nested[0].nested?.length && !inlineStyles) {
    return nested[0];
  }

  // Wrap children in a section
  const props: Record<string, unknown> = {};
  if (inlineStyles) props.style = inlineStyles;
  return {
    block: {
      id,
      type: 'section',
      children: nested.map((c) => c.block.id),
      ...(Object.keys(props).length > 0 ? { props } : {}),
    },
    nested,
  };
}

function getDirectContent(el: Element): Element[] {
  return Array.from(el.children).filter((c) => !SKIP_TAGS.has(c.tagName.toLowerCase()));
}

function processChildElements(parent: Element, opts: ConvertOptions): ConvertResult[] {
  const result: ConvertResult[] = [];
  for (const child of getDirectContent(parent)) {
    const converted = elementToBlock(child, opts);
    if (converted) result.push(converted);
  }
  return result;
}

function collectAllBlocks(results: ConvertResult[]): Record<string, BaseBlock> {
  const blocks: Record<string, BaseBlock> = {};
  function visit(r: ConvertResult) {
    blocks[r.block.id] = r.block;
    for (const n of r.nested ?? []) {
      visit(n);
    }
  }
  for (const r of results) {
    visit(r);
  }
  return blocks;
}

/**
 * Convert HTML string to PageContentJson.
 */
export function htmlToBlocks(html: string, baseUrl = ''): PageContentJson {
  const doc = parseHtml(html);
  const root = doc.body;
  if (!root) {
    return { root: '', blocks: {} };
  }

  const opts: ConvertOptions = { baseUrl };
  const childBlocks = processChildElements(root, opts);

  if (childBlocks.length === 0) {
    const fallbackId = generateId();
    return {
      root: fallbackId,
      blocks: {
        [fallbackId]: {
          id: fallbackId,
          type: 'customHtml',
          props: { html: root.innerHTML },
        },
      },
    };
  }

  const rootId = generateId();
  const allBlocks = collectAllBlocks(childBlocks);

  const rootSection: BaseBlock = {
    id: rootId,
    type: 'section',
    children: childBlocks.map((c) => c.block.id),
  };
  allBlocks[rootId] = rootSection;

  return { root: rootId, blocks: allBlocks };
}
