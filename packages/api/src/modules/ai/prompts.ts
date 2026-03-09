/**
 * System prompt construction for the AI chat module.
 * Builds context-aware prompts from page state and block schemas.
 */

import type { PageSummary, SectionMapEntry } from './ai.types.js';

// -------------------------------------------------------------------------
// Block type descriptions (human-readable)
// -------------------------------------------------------------------------

const BLOCK_TYPE_DESCRIPTIONS: Record<string, string> = {
  // Layout
  section: 'Top-level page section. Contains a single container child. Props: backgroundColor, backgroundImage, paddingTop, paddingBottom, id (anchor).',
  container: 'Constrains content to a max-width. Contains child blocks. Props: maxWidth, paddingX.',
  grid: 'CSS grid layout. Props: columns (number), gap, minChildWidth.',
  columns: 'Flexbox row of equal-width columns. Props: gap, verticalAlign.',
  stack: 'Vertical flex stack. Props: gap, align (left/center/right).',

  // Content
  text: 'Rich text block. Props: html (HTML string), fontSize, fontFamily, color, textAlign, lineHeight.',
  headline: 'Heading block (h1-h6). Props: text, level (1-6), fontSize, fontFamily, fontWeight, color, textAlign.',
  paragraph: 'Paragraph text. Props: text, fontSize, fontFamily, color, textAlign, lineHeight.',
  image: 'Image block. Props: src, alt, width, height, objectFit, borderRadius.',
  button: 'CTA button. Props: text, href, variant (filled/outline/ghost), backgroundColor, textColor, fontSize, borderRadius, paddingX, paddingY.',
  divider: 'Horizontal rule. Props: color, thickness, width, style (solid/dashed/dotted).',
  spacer: 'Empty vertical space. Props: height.',
  video: 'Embedded video. Props: src, poster, autoplay, loop, muted.',
  shapeRectangle: 'Decorative rectangle. Props: width, height, backgroundColor, borderRadius, borderColor, borderWidth.',
  shapeCircle: 'Decorative circle. Props: size, backgroundColor, borderColor, borderWidth.',
  countdown: 'Countdown timer. Props: targetDate, labelDays, labelHours, labelMinutes, labelSeconds, fontSize, color.',
  table: 'Data table. Props: rows (2D array), headerRow (boolean), striped.',
  accordion: 'Expandable FAQ/accordion. Props: items (array of {title, content}), allowMultiple.',
  carousel: 'Image/content carousel. Props: items, autoplay, interval, showDots, showArrows.',

  // Patterns (compound blocks)
  hero: 'Hero section pattern. Pre-composed: headline + paragraph + button(s).',
  features: 'Features grid pattern. Pre-composed: headline + grid of feature cards.',
  testimonials: 'Testimonials pattern. Pre-composed: headline + grid of testimonial cards.',
  faq: 'FAQ pattern. Pre-composed: headline + accordion.',
  logos: 'Logo cloud. Props: items (array of {src, alt}), grayscale.',

  // Form
  form: 'Form block. Props: fields (array of {name, type, label, required}), submitText, action, method.',

  // Embed
  customHtml: 'Raw HTML embed. Props: html.',
};

export function buildBlockTypeDescriptions(): string {
  const lines: string[] = [];
  for (const [type, desc] of Object.entries(BLOCK_TYPE_DESCRIPTIONS)) {
    lines.push(`- **${type}**: ${desc}`);
  }
  return lines.join('\n');
}

// -------------------------------------------------------------------------
// Page context formatting
// -------------------------------------------------------------------------

function formatPageSummary(ctx: PageSummary): string {
  const lines: string[] = [
    `Sections: ${ctx.sectionCount}`,
    `Total blocks: ${ctx.blockCount}`,
    `Block counts: ${Object.entries(ctx.blockCountByType).map(([t, n]) => `${t}(${n})`).join(', ')}`,
    `Color palette: ${ctx.colorPalette.length > 0 ? ctx.colorPalette.join(', ') : 'none detected'}`,
    `Fonts: ${ctx.fontFamilies.length > 0 ? ctx.fontFamilies.join(', ') : 'none detected'}`,
    `Images: ${ctx.imageCount}`,
    `Has form: ${ctx.hasForm ? 'yes' : 'no'}`,
    `Layout mode: ${ctx.layoutMode}`,
  ];

  if (ctx.textSnippets.length > 0) {
    lines.push('', 'Text content (first 20 snippets):');
    for (const s of ctx.textSnippets.slice(0, 20)) {
      const preview = s.text.length > 80 ? s.text.slice(0, 80) + '...' : s.text;
      lines.push(`  [${s.blockId}] (${s.type}) "${preview}"`);
    }
  }

  return lines.join('\n');
}

function formatSectionMap(sections: SectionMapEntry[]): string {
  if (sections.length === 0) return 'No sections in page.';

  const lines: string[] = [];
  for (const s of sections) {
    lines.push(`[${s.index}] ${s.sectionId} — "${s.label}" (${s.type}, ${s.blockCount} blocks)`);
    if (s.childTypes.length > 0) {
      lines.push(`    Child types: ${s.childTypes.join(', ')}`);
    }
    if (s.textSnippets.length > 0) {
      for (const snip of s.textSnippets.slice(0, 3)) {
        const preview = snip.length > 60 ? snip.slice(0, 60) + '...' : snip;
        lines.push(`    Text: "${preview}"`);
      }
    }
  }
  return lines.join('\n');
}

// -------------------------------------------------------------------------
// Mutation descriptions
// -------------------------------------------------------------------------

const MUTATION_DESCRIPTIONS = `
Available mutations (use as tool calls):
- insertBlock: Add a new block as a child of a parent. Params: parentId, index, block {id, type, props, children}
- updateBlockProps: Update properties on an existing block. Params: blockId, props (partial update, merged with existing)
- removeBlock: Remove a block and its descendants. Params: blockId
- moveBlock: Move a block to a new parent/position. Params: blockId, newParentId, newIndex
- replaceText: Replace the text content of a text/headline/paragraph block. Params: blockId, text
- duplicateBlock: Duplicate a block in place. Params: blockId
- reorderChildren: Reorder the children of a container. Params: parentId, childIds (full ordered list)
- updatePageSettings: Update page-level settings. Params: settings object
- updateScripts: Update page scripts (head/body). Params: scripts object
- setLayoutMode: Switch between fluid and canvas layout. Params: mode ("fluid" | "canvas")
`.trim();

// -------------------------------------------------------------------------
// System prompt builder
// -------------------------------------------------------------------------

export function buildSystemPrompt(
  pageContext: PageSummary,
  sectionMap: SectionMapEntry[],
  selectedBlockId?: string,
): string {
  const parts: string[] = [
    `You are an AI assistant for a landing page editor. You help users edit their pages through natural language.`,
    '',
    '## Current Page',
    formatPageSummary(pageContext),
    '',
    '## Page Structure',
    formatSectionMap(sectionMap),
  ];

  if (selectedBlockId) {
    parts.push('', `## Currently Selected Block`, `Block ID: ${selectedBlockId}`);
  }

  parts.push(
    '',
    '## Available Block Types',
    buildBlockTypeDescriptions(),
    '',
    '## Available Mutations',
    MUTATION_DESCRIPTIONS,
    '',
    '## Guidelines',
    '- Make minimal, targeted changes. Do not rewrite the entire page unless asked.',
    '- Preserve existing design decisions (colors, fonts, spacing) unless the user asks to change them.',
    '- Use the page\'s existing color palette and fonts when adding new content.',
    '- When adding sections, use professional placeholder text — never "Lorem ipsum".',
    '- Always explain what you changed and why in your text response.',
    '- When generating block IDs, use descriptive kebab-case (e.g., "hero-headline", "features-grid").',
    '- For text content, use realistic business-oriented copy.',
    '- If the user\'s request is ambiguous, ask a clarifying question instead of guessing.',
    '- You can make multiple mutations in a single response when they are related.',
  );

  return parts.join('\n');
}
