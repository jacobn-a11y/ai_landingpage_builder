import { describe, it, expect } from 'vitest';
import { classifyIntent, type ClassifyContext } from '../intent/deterministic-router';
import { resolveColor, COLOR_NAMES } from '../intent/color-names';
import { resolveBlockReference, type ResolverContext } from '../intent/block-resolver';
import { buildPageSummary } from '../page-context';
import { buildSectionMap } from '../section-map';
import type { EditorContentJson, EditorBlock } from '../../pages/editor/types';

// ---------------------------------------------------------------------------
// Shared test fixture
// ---------------------------------------------------------------------------
function makeTestPage(): EditorContentJson {
  const blocks: Record<string, EditorBlock> = {
    root: {
      id: 'root',
      type: 'section',
      children: ['hero_1', 'features_1', 'section_3'],
    },
    hero_1: {
      id: 'hero_1',
      type: 'hero',
      children: ['headline_1', 'para_1', 'btn_1', 'img_1'],
    },
    headline_1: {
      id: 'headline_1',
      type: 'headline',
      props: {
        text: 'Welcome to Our Amazing Product',
        fontSize: 48,
        fontWeight: 'bold',
        tag: 'h1',
      },
    },
    para_1: {
      id: 'para_1',
      type: 'paragraph',
      props: { text: 'Hero subtitle text here' },
    },
    btn_1: {
      id: 'btn_1',
      type: 'button',
      props: { text: 'Get Started', backgroundColor: '#3B82F6' },
    },
    img_1: {
      id: 'img_1',
      type: 'image',
      props: { src: 'https://example.com/hero.jpg' },
    },
    features_1: {
      id: 'features_1',
      type: 'features',
      children: ['headline_2', 'para_2'],
    },
    headline_2: {
      id: 'headline_2',
      type: 'headline',
      props: { text: 'Our Features', fontSize: 32, tag: 'h2' },
    },
    para_2: {
      id: 'para_2',
      type: 'paragraph',
      props: { text: 'Feature description' },
    },
    section_3: {
      id: 'section_3',
      type: 'section',
      children: ['form_1'],
    },
    form_1: {
      id: 'form_1',
      type: 'form',
    },
  };
  return { root: 'root', blocks, layoutMode: 'fluid' };
}

function makeContext(selectedBlockId?: string): ClassifyContext {
  const content = makeTestPage();
  return {
    selectedBlockId,
    pageSummary: buildPageSummary(content),
    sectionMap: buildSectionMap(content),
    content,
  };
}

function makeResolverContext(selectedBlockId?: string): ResolverContext {
  const content = makeTestPage();
  return {
    selectedBlockId,
    content,
    sectionMap: buildSectionMap(content),
  };
}

// ---------------------------------------------------------------------------
// Color name resolution
// ---------------------------------------------------------------------------
describe('resolveColor', () => {
  it('resolves named colors', () => {
    expect(resolveColor('red')).toBe('#EF4444');
    expect(resolveColor('blue')).toBe('#3B82F6');
    expect(resolveColor('green')).toBe('#22C55E');
    expect(resolveColor('white')).toBe('#FFFFFF');
    expect(resolveColor('black')).toBe('#000000');
  });

  it('resolves hex with hash', () => {
    expect(resolveColor('#FF0000')).toBe('#FF0000');
    expect(resolveColor('#abc')).toBe('#ABC');
  });

  it('resolves hex without hash', () => {
    expect(resolveColor('FF0000')).toBe('#FF0000');
  });

  it('is case-insensitive', () => {
    expect(resolveColor('RED')).toBe('#EF4444');
    expect(resolveColor('Blue')).toBe('#3B82F6');
  });

  it('returns null for unknown values', () => {
    expect(resolveColor('supercalifragilistic')).toBeNull();
  });

  it('handles compound color names by checking words', () => {
    expect(resolveColor('light blue')).toBe('#3B82F6');
  });

  it('covers 30+ color names', () => {
    expect(Object.keys(COLOR_NAMES).length).toBeGreaterThanOrEqual(30);
  });
});

// ---------------------------------------------------------------------------
// Block reference resolution
// ---------------------------------------------------------------------------
describe('resolveBlockReference', () => {
  it('"this" resolves to selectedBlockId', () => {
    expect(resolveBlockReference('this', makeResolverContext('btn_1'))).toBe('btn_1');
  });

  it('"the selected block" resolves to selectedBlockId', () => {
    expect(resolveBlockReference('the selected block', makeResolverContext('headline_1'))).toBe('headline_1');
  });

  it('"the headline" resolves to first headline', () => {
    expect(resolveBlockReference('the headline', makeResolverContext())).toBe('headline_1');
  });

  it('"the button" resolves to first button', () => {
    expect(resolveBlockReference('the button', makeResolverContext())).toBe('btn_1');
  });

  it('"the image" resolves to first image', () => {
    expect(resolveBlockReference('the image', makeResolverContext())).toBe('img_1');
  });

  it('"the hero" resolves to hero section', () => {
    expect(resolveBlockReference('the hero', makeResolverContext())).toBe('hero_1');
  });

  it('"the features" resolves to features section', () => {
    expect(resolveBlockReference('the features', makeResolverContext())).toBe('features_1');
  });

  it('"the second section" resolves by ordinal', () => {
    expect(resolveBlockReference('the second section', makeResolverContext())).toBe('features_1');
  });

  it('"the first section" resolves by ordinal', () => {
    expect(resolveBlockReference('the first section', makeResolverContext())).toBe('hero_1');
  });

  it('"section 3" resolves by number', () => {
    expect(resolveBlockReference('section 3', makeResolverContext())).toBe('section_3');
  });

  it('returns null for unknown reference', () => {
    expect(resolveBlockReference('the foobar', makeResolverContext())).toBeNull();
  });

  it('"this" returns null when no block is selected', () => {
    expect(resolveBlockReference('this', makeResolverContext())).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Intent classification — deterministic patterns
// ---------------------------------------------------------------------------
describe('classifyIntent', () => {
  // -- Font size --
  it('"make it bigger" → changeFontSize +4', () => {
    const result = classifyIntent('make it bigger', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(4);
      expect(result.blockId).toBe('headline_1');
    }
  });

  it('"make it smaller" → changeFontSize -4', () => {
    const result = classifyIntent('make it smaller', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(-4);
    }
  });

  it('"make it much bigger" → changeFontSize +8', () => {
    const result = classifyIntent('make it much bigger', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(8);
    }
  });

  it('"make it much smaller" → changeFontSize -8', () => {
    const result = classifyIntent('make it much smaller', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(-8);
    }
  });

  it('"increase font size" → changeFontSize +4', () => {
    const result = classifyIntent('increase font size', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(4);
    }
  });

  it('"decrease the font size" → changeFontSize -4', () => {
    const result = classifyIntent('decrease the font size', makeContext('headline_1'));
    expect(result.type).toBe('changeFontSize');
    if (result.type === 'changeFontSize') {
      expect(result.delta).toBe(-4);
    }
  });

  it('"set font size to 24" → setFontSize 24', () => {
    const result = classifyIntent('set font size to 24', makeContext('headline_1'));
    expect(result.type).toBe('setFontSize');
    if (result.type === 'setFontSize') {
      expect(result.value).toBe(24);
      expect(result.blockId).toBe('headline_1');
    }
  });

  // -- Color --
  it('"make it red" → changeColor textColor', () => {
    const result = classifyIntent('make it red', makeContext('headline_1'));
    expect(result.type).toBe('changeColor');
    if (result.type === 'changeColor') {
      expect(result.value).toBe('#EF4444');
      expect(result.blockId).toBe('headline_1');
    }
  });

  it('"change background color to blue" → changeColor backgroundColor', () => {
    const result = classifyIntent('change background color to blue', makeContext('headline_1'));
    expect(result.type).toBe('changeColor');
    if (result.type === 'changeColor') {
      expect(result.prop).toBe('backgroundColor');
      expect(result.value).toBe('#3B82F6');
    }
  });

  it('"change text color to green" → changeColor textColor', () => {
    const result = classifyIntent('change text color to green', makeContext('headline_1'));
    expect(result.type).toBe('changeColor');
    if (result.type === 'changeColor') {
      expect(result.prop).toBe('textColor');
      expect(result.value).toBe('#22C55E');
    }
  });

  // -- Font --
  it('"change font to Roboto" → changeFont', () => {
    const result = classifyIntent('change font to Roboto', makeContext('headline_1'));
    expect(result.type).toBe('changeFont');
    if (result.type === 'changeFont') {
      expect(result.fontFamily).toBe('Roboto');
      expect(result.blockId).toBe('headline_1');
    }
  });

  it('"switch font to Poppins" → changeFont', () => {
    const result = classifyIntent('switch font to Poppins', makeContext('headline_1'));
    expect(result.type).toBe('changeFont');
    if (result.type === 'changeFont') {
      expect(result.fontFamily).toBe('Poppins');
    }
  });

  // -- Remove --
  it('"delete this" → removeBlock', () => {
    const result = classifyIntent('delete this', makeContext('btn_1'));
    expect(result.type).toBe('removeBlock');
    if (result.type === 'removeBlock') {
      expect(result.blockId).toBe('btn_1');
    }
  });

  it('"remove the button" → removeBlock', () => {
    const result = classifyIntent('remove the button', makeContext());
    expect(result.type).toBe('removeBlock');
    if (result.type === 'removeBlock') {
      expect(result.blockId).toBe('btn_1');
    }
  });

  // -- Duplicate --
  it('"duplicate this" → duplicateBlock', () => {
    const result = classifyIntent('duplicate this', makeContext('headline_1'));
    expect(result.type).toBe('duplicateBlock');
    if (result.type === 'duplicateBlock') {
      expect(result.blockId).toBe('headline_1');
    }
  });

  it('"copy this block" → duplicateBlock', () => {
    const result = classifyIntent('copy this block', makeContext('btn_1'));
    expect(result.type).toBe('duplicateBlock');
    if (result.type === 'duplicateBlock') {
      expect(result.blockId).toBe('btn_1');
    }
  });

  // -- Reorder --
  it('"move this up" → reorder up', () => {
    const result = classifyIntent('move this up', makeContext('features_1'));
    expect(result.type).toBe('reorder');
    if (result.type === 'reorder') {
      expect(result.direction).toBe('up');
      expect(result.blockId).toBe('features_1');
    }
  });

  it('"move this down" → reorder down', () => {
    const result = classifyIntent('move this down', makeContext('hero_1'));
    expect(result.type).toBe('reorder');
    if (result.type === 'reorder') {
      expect(result.direction).toBe('down');
    }
  });

  // -- Alignment --
  it('"center this" → changeAlignment center', () => {
    const result = classifyIntent('center this', makeContext('headline_1'));
    expect(result.type).toBe('changeAlignment');
    if (result.type === 'changeAlignment') {
      expect(result.align).toBe('center');
      expect(result.blockId).toBe('headline_1');
    }
  });

  it('"left-align the headline" → changeAlignment left', () => {
    const result = classifyIntent('left-align the headline', makeContext());
    expect(result.type).toBe('changeAlignment');
    if (result.type === 'changeAlignment') {
      expect(result.align).toBe('left');
    }
  });

  it('"right align it" → changeAlignment right', () => {
    const result = classifyIntent('right align it', makeContext('para_1'));
    expect(result.type).toBe('changeAlignment');
    if (result.type === 'changeAlignment') {
      expect(result.align).toBe('right');
    }
  });

  // -- Visibility --
  it('"hide on mobile" → toggleVisibility mobile', () => {
    const result = classifyIntent('hide on mobile', makeContext('hero_1'));
    expect(result.type).toBe('toggleVisibility');
    if (result.type === 'toggleVisibility') {
      expect(result.device).toBe('mobile');
      expect(result.blockId).toBe('hero_1');
    }
  });

  it('"hide on desktop" → toggleVisibility desktop', () => {
    const result = classifyIntent('hide on desktop', makeContext('btn_1'));
    expect(result.type).toBe('toggleVisibility');
    if (result.type === 'toggleVisibility') {
      expect(result.device).toBe('desktop');
    }
  });

  // -- Add section --
  it('"add a hero section" → addSection', () => {
    const result = classifyIntent('add a hero section', makeContext());
    expect(result.type).toBe('addSection');
    if (result.type === 'addSection') {
      expect(result.sectionType).toBe('hero');
    }
  });

  it('"add a testimonials section after the features" → addSection with ref', () => {
    const result = classifyIntent(
      'add a testimonials section after the features',
      makeContext(),
    );
    expect(result.type).toBe('addSection');
    if (result.type === 'addSection') {
      expect(result.sectionType).toBe('testimonials');
      expect(result.position).toBe('after');
    }
  });

  // -- Fallthrough to needsLLM --
  it('vague messages fall through to needsLLM', () => {
    const result = classifyIntent(
      'make the page look more professional',
      makeContext(),
    );
    expect(result.type).toBe('needsLLM');
  });

  it('multi-step requests fall through to needsLLM', () => {
    const result = classifyIntent(
      'redesign the hero section with a gradient background and animated text',
      makeContext(),
    );
    expect(result.type).toBe('needsLLM');
  });

  it('creative requests fall through to needsLLM', () => {
    const result = classifyIntent(
      'write better copy for the headline',
      makeContext(),
    );
    expect(result.type).toBe('needsLLM');
  });

  it('needsLLM includes the user message and page summary', () => {
    const msg = 'please improve the overall design';
    const ctx = makeContext();
    const result = classifyIntent(msg, ctx);
    expect(result.type).toBe('needsLLM');
    if (result.type === 'needsLLM') {
      expect(result.userMessage).toBe(msg);
      expect(result.context.blockCount).toBeGreaterThan(0);
    }
  });
});
