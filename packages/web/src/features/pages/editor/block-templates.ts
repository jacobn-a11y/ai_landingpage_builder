/**
 * Predefined block templates for quick insertion.
 */

function genId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface BlockTemplate {
  id: string;
  label: string;
  category: string;
  blockJson: { root: string; blocks: Record<string, object> };
}

export const BLOCK_TEMPLATES: BlockTemplate[] = [
  {
    id: 'hero-cta',
    label: 'Hero with CTA',
    category: 'pattern',
    blockJson: (() => {
      const h = genId();
      const t = genId();
      const b = genId();
      return {
        root: h,
        blocks: {
          [h]: { id: h, type: 'hero', children: [t, b] },
          [t]: { id: t, type: 'text', props: { content: 'Your headline here' } },
          [b]: { id: b, type: 'button', props: { text: 'Get Started', href: '#' } },
        },
      };
    })(),
  },
  {
    id: 'features-3',
    label: 'Features 3-column',
    category: 'pattern',
    blockJson: (() => {
      const f = genId();
      const c1 = genId();
      const c2 = genId();
      const c3 = genId();
      const t1 = genId();
      const t2 = genId();
      const t3 = genId();
      return {
        root: f,
        blocks: {
          [f]: { id: f, type: 'features', children: [c1, c2, c3] },
          [c1]: { id: c1, type: 'container', children: [t1] },
          [c2]: { id: c2, type: 'container', children: [t2] },
          [c3]: { id: c3, type: 'container', children: [t3] },
          [t1]: { id: t1, type: 'text', props: { content: 'Feature 1' } },
          [t2]: { id: t2, type: 'text', props: { content: 'Feature 2' } },
          [t3]: { id: t3, type: 'text', props: { content: 'Feature 3' } },
        },
      };
    })(),
  },
  {
    id: 'cta-section',
    label: 'CTA Section',
    category: 'pattern',
    blockJson: (() => {
      const s = genId();
      const t = genId();
      const b = genId();
      return {
        root: s,
        blocks: {
          [s]: { id: s, type: 'section', children: [t, b] },
          [t]: { id: t, type: 'text', props: { content: 'Ready to get started?' } },
          [b]: { id: b, type: 'button', props: { text: 'Sign up now', href: '#' } },
        },
      };
    })(),
  },
];
