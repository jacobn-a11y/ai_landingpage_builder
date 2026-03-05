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

interface ConvertResult {
  block: BaseBlock;
  nested?: ConvertResult[];
}

function generateId(): string {
  return `block-${Math.random().toString(36).slice(2, 11)}`;
}

function getElementHtml(el: Element): string {
  return el.outerHTML;
}

function serializeElement(el: Element): string {
  const div = el.ownerDocument.createElement('div');
  div.appendChild(el.cloneNode(true));
  return div.innerHTML;
}

/**
 * Check if element should be treated as Custom HTML (tables, complex layouts).
 */
function isComplexHtml(el: Element): boolean {
  const tag = el.tagName.toLowerCase();
  return tag === 'table' || tag === 'iframe' || tag === 'video' || tag === 'audio';
}

/**
 * Convert a single DOM element to a block.
 * Returns null if the element should be skipped (e.g. script, style).
 */
function elementToBlock(
  el: Element,
  doc: Document,
  baseUrl: string
): ConvertResult | null {
  const tag = el.tagName.toLowerCase();

  if (tag === 'script' || tag === 'style' || tag === 'noscript') {
    return null;
  }

  const id = generateId();

  if (tag === 'form') {
    return {
      block: {
        id,
        type: 'customHtml',
        props: { html: getElementHtml(el) },
      },
    };
  }

  if (isComplexHtml(el)) {
    return {
      block: {
        id,
        type: 'customHtml',
        props: { html: getElementHtml(el) },
      },
    };
  }

  if (tag.match(/^h[1-6]$/)) {
    const level = parseInt(tag[1], 10) as 1 | 2 | 3 | 4 | 5 | 6;
    return {
      block: {
        id,
        type: 'text',
        props: { text: getTextContent(el), tag: `h${level}` },
      },
    };
  }

  if (tag === 'p') {
    return {
      block: {
        id,
        type: 'text',
        props: { text: getTextContent(el), tag: 'p' },
      },
    };
  }

  if (tag === 'img') {
    const src = el.getAttribute('src') ?? '';
    const alt = el.getAttribute('alt') ?? '';
    let resolvedSrc = src;
    if (src && baseUrl && !src.startsWith('http') && !src.startsWith('data:') && !src.startsWith('/')) {
      try {
        resolvedSrc = new URL(src, baseUrl).href;
      } catch {
        // keep original if URL resolution fails
      }
    }
    return {
      block: {
        id,
        type: 'image',
        props: { src: resolvedSrc, alt },
      },
    };
  }

  if (tag === 'a' && looksLikeButton(el)) {
    const href = el.getAttribute('href') ?? '#';
    return {
      block: {
        id,
        type: 'button',
        props: { text: getTextContent(el), href },
      },
    };
  }

  if (tag === 'hr') {
    return {
      block: {
        id,
        type: 'divider',
      },
    };
  }

  if (isSectionLike(el)) {
    const nested = processChildElements(el, doc, baseUrl);
    return {
      block: {
        id,
        type: 'section',
        children: nested.map((c) => c.block.id),
      },
      nested,
    };
  }

  if (tag === 'div' || tag === 'article' || tag === 'aside' || tag === 'header' || tag === 'footer') {
    const directContent = getDirectContent(el);
    if (directContent.length === 0) {
      const nested = processChildElements(el, doc, baseUrl);
      if (nested.length === 0) return null;
      if (nested.length === 1 && !nested[0].nested?.length) {
        return nested[0];
      }
      return {
        block: {
          id,
          type: 'section',
          children: nested.map((c) => c.block.id),
        },
        nested,
      };
    }
    const hasOnlyMappable = directContent.every((c) => {
      const t = c.tagName.toLowerCase();
      return t.match(/^h[1-6]$/) || t === 'p' || t === 'img' || t === 'a' || t === 'form';
    });
    if (hasOnlyMappable && directContent.length > 0) {
      const nested = processChildElements(el, doc, baseUrl);
      return {
        block: {
          id,
          type: 'section',
          children: nested.map((c) => c.block.id),
        },
        nested,
      };
    }
    return {
      block: {
        id,
        type: 'customHtml',
        props: { html: serializeElement(el) },
      },
    };
  }

  return {
    block: {
      id,
      type: 'customHtml',
      props: { html: serializeElement(el) },
    },
  };
}

function getDirectContent(el: Element): Element[] {
  const result: Element[] = [];
  for (const child of el.children) {
    if (child.tagName.toLowerCase() !== 'script' && child.tagName.toLowerCase() !== 'style') {
      result.push(child);
    }
  }
  return result;
}

function processChildElements(
  parent: Element,
  doc: Document,
  baseUrl: string
): ConvertResult[] {
  const result: ConvertResult[] = [];
  for (const child of parent.children) {
    if (child.tagName.toLowerCase() === 'script' || child.tagName.toLowerCase() === 'style') {
      continue;
    }
    const converted = elementToBlock(child, doc, baseUrl);
    if (converted) {
      result.push(converted);
    }
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

  const childBlocks = processChildElements(root, doc, baseUrl);
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

  return {
    root: rootId,
    blocks: allBlocks,
  };
}
