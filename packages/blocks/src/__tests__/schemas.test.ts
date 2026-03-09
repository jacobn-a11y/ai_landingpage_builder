import { describe, it, expect } from 'vitest';
import {
  BlockPropsSchemaMap,
  validateBlockProps,
  sanitizeBlockProps,
  getDefaultProps,
  getEditableProps,
  getBlockSchema,
  BlockDefaultProps,
} from '../schemas';
import type { BlockType } from '../block-types';

const ALL_BLOCK_TYPES: BlockType[] = [
  'section', 'container', 'grid', 'columns', 'stack',
  'text', 'headline', 'paragraph', 'image', 'button',
  'divider', 'spacer', 'video', 'shapeRectangle', 'shapeCircle',
  'countdown', 'table', 'accordion', 'carousel',
  'hero', 'features', 'testimonials', 'faq', 'logos',
  'form', 'customHtml',
];

describe('BlockPropsSchemaMap', () => {
  it('has a schema for every block type', () => {
    for (const type of ALL_BLOCK_TYPES) {
      expect(BlockPropsSchemaMap[type]).toBeDefined();
    }
  });

  it('every schema accepts empty props', () => {
    for (const type of ALL_BLOCK_TYPES) {
      const result = BlockPropsSchemaMap[type].safeParse({});
      expect(result.success).toBe(true);
    }
  });
});

describe('validateBlockProps', () => {
  it('accepts valid headline props', () => {
    const result = validateBlockProps('headline', {
      content: 'Hello World',
      headingLevel: 'h1',
      fontSize: 32,
      fontWeight: '700',
      textAlign: 'center',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid headingLevel for headline', () => {
    const result = validateBlockProps('headline', {
      headingLevel: 'h99',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid image props', () => {
    const result = validateBlockProps('image', {
      src: 'https://example.com/photo.jpg',
      alt: 'A photo',
      objectFit: 'cover',
      lazyLoad: true,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid objectFit for image', () => {
    const result = validateBlockProps('image', {
      objectFit: 'stretch',
    });
    expect(result.success).toBe(false);
  });

  it('accepts valid button props', () => {
    const result = validateBlockProps('button', {
      text: 'Click Me',
      href: '/signup',
      openNewTab: true,
      buttonBgColor: '#3B82F6',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid grid props', () => {
    const result = validateBlockProps('grid', { columns: 4 });
    expect(result.success).toBe(true);
  });

  it('rejects grid columns > 12', () => {
    const result = validateBlockProps('grid', { columns: 13 });
    expect(result.success).toBe(false);
  });

  it('accepts valid video props', () => {
    const result = validateBlockProps('video', {
      url: 'https://youtube.com/watch?v=123',
      provider: 'youtube',
      autoplay: false,
      mute: true,
      aspectRatio: '16/9',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid video provider', () => {
    const result = validateBlockProps('video', { provider: 'tiktok' });
    expect(result.success).toBe(false);
  });

  it('accepts valid accordion props', () => {
    const result = validateBlockProps('accordion', {
      sections: [{ title: 'Q1', content: 'A1' }],
      expandOneOnly: true,
      titleFontSize: 18,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid carousel props', () => {
    const result = validateBlockProps('carousel', {
      slides: [{ imageUrl: 'test.jpg', alt: 'Slide 1' }],
      autoPlay: true,
      autoPlayInterval: 5000,
    });
    expect(result.success).toBe(true);
  });

  it('rejects carousel autoPlayInterval < 500', () => {
    const result = validateBlockProps('carousel', { autoPlayInterval: 100 });
    expect(result.success).toBe(false);
  });

  it('accepts valid table props', () => {
    const result = validateBlockProps('table', {
      rows: [['Name', 'Price'], ['Item A', '$10']],
      hasHeader: true,
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid form props', () => {
    const result = validateBlockProps('form', {
      formId: 'form_123',
      submitText: 'Sign Up',
      successMessage: 'Thanks!',
    });
    expect(result.success).toBe(true);
  });

  it('accepts valid customHtml props', () => {
    const result = validateBlockProps('customHtml', {
      html: '<div>Hello</div>',
    });
    expect(result.success).toBe(true);
  });

  it('returns error for unknown block type', () => {
    const result = validateBlockProps('nonexistent' as BlockType, {});
    expect(result.success).toBe(false);
  });
});

describe('universal props', () => {
  it('accepts universal spacing on any block', () => {
    for (const type of ALL_BLOCK_TYPES) {
      const result = validateBlockProps(type, {
        marginTop: 10,
        marginBottom: 20,
        paddingLeft: 15,
        paddingRight: 15,
      });
      expect(result.success).toBe(true);
    }
  });

  it('accepts universal border on any block', () => {
    const result = validateBlockProps('section', {
      borderWidth: 2,
      borderColor: '#000',
      borderStyle: 'dashed',
      borderRadius: 8,
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid borderStyle', () => {
    const result = validateBlockProps('section', {
      borderStyle: 'wavy',
    });
    expect(result.success).toBe(false);
  });

  it('accepts opacity 0-100', () => {
    expect(validateBlockProps('section', { opacity: 0 }).success).toBe(true);
    expect(validateBlockProps('section', { opacity: 100 }).success).toBe(true);
  });

  it('rejects opacity > 100', () => {
    expect(validateBlockProps('section', { opacity: 101 }).success).toBe(false);
  });

  it('accepts box shadow', () => {
    const result = validateBlockProps('container', {
      boxShadowOffsetX: 2,
      boxShadowOffsetY: 4,
      boxShadowBlur: 8,
      boxShadowSpread: 0,
      boxShadowColor: 'rgba(0,0,0,0.2)',
    });
    expect(result.success).toBe(true);
  });

  it('accepts device visibility', () => {
    expect(validateBlockProps('headline', { visibleOn: 'desktop' }).success).toBe(true);
    expect(validateBlockProps('headline', { visibleOn: 'mobile' }).success).toBe(true);
    expect(validateBlockProps('headline', { visibleOn: 'all' }).success).toBe(true);
  });

  it('accepts responsive overrides', () => {
    const result = validateBlockProps('headline', {
      fontSize: 32,
      overrides: {
        mobile: { fontSize: 20 },
        tablet: { fontSize: 26 },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts canvas positioning', () => {
    const result = validateBlockProps('button', {
      x: 100,
      y: 200,
      width: 300,
      height: 50,
    });
    expect(result.success).toBe(true);
  });
});

describe('sanitizeBlockProps', () => {
  it('preserves valid props', () => {
    const props = { content: 'Hello', fontSize: 16 };
    const result = sanitizeBlockProps('headline', props);
    expect(result.content).toBe('Hello');
    expect(result.fontSize).toBe(16);
  });

  it('returns original props for unknown type', () => {
    const props = { foo: 'bar' };
    const result = sanitizeBlockProps('nonexistent' as BlockType, props);
    expect(result).toBe(props);
  });
});

describe('getDefaultProps', () => {
  it('returns defaults for headline', () => {
    const defaults = getDefaultProps('headline');
    expect(defaults.content).toBe('Headline');
    expect(defaults.headingLevel).toBe('h2');
    expect(defaults.fontWeight).toBe('700');
  });

  it('returns defaults for button', () => {
    const defaults = getDefaultProps('button');
    expect(defaults.text).toBe('Button');
    expect(defaults.href).toBe('#');
  });

  it('returns defaults for spacer', () => {
    const defaults = getDefaultProps('spacer');
    expect(defaults.height).toBe(24);
  });

  it('returns empty object for blocks without specific defaults', () => {
    const defaults = getDefaultProps('container');
    expect(defaults).toEqual({});
  });
});

describe('getEditableProps', () => {
  it('returns prop names for headline', () => {
    const props = getEditableProps('headline');
    expect(props).toContain('content');
    expect(props).toContain('headingLevel');
    expect(props).toContain('fontSize');
    expect(props).toContain('fontWeight');
    // Also includes universal
    expect(props).toContain('marginTop');
    expect(props).toContain('backgroundColor');
  });

  it('returns empty array for unknown type', () => {
    expect(getEditableProps('nonexistent' as BlockType)).toEqual([]);
  });
});

describe('getBlockSchema', () => {
  it('returns schema for known type', () => {
    const schema = getBlockSchema('headline');
    expect(schema).toBeDefined();
  });

  it('returns undefined for unknown type', () => {
    expect(getBlockSchema('nonexistent' as BlockType)).toBeUndefined();
  });
});
