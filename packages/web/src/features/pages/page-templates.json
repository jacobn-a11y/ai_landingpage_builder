/**
 * Predefined page templates for new pages.
 */

function genId(): string {
  return `b_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface PageTemplate {
  id: string;
  label: string;
  description: string;
  contentJson: { root: string; blocks: Record<string, object> };
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    label: 'Blank',
    description: 'Start from scratch',
    contentJson: { root: '', blocks: {} },
  },
  {
    id: 'landing',
    label: 'Landing Page',
    description: 'Hero, features, CTA',
    contentJson: (() => {
      const root = genId();
      const s1 = genId();
      const h = genId();
      const t1 = genId();
      const btn = genId();
      const s2 = genId();
      const f = genId();
      const c1 = genId();
      const c2 = genId();
      const c3 = genId();
      const t2 = genId();
      const t3 = genId();
      const t4 = genId();
      const s3 = genId();
      const t5 = genId();
      const btn2 = genId();
      return {
        root,
        blocks: {
          [root]: { id: root, type: 'container', children: [s1, s2, s3] },
          [s1]: { id: s1, type: 'section', children: [h] },
          [h]: { id: h, type: 'hero', children: [t1, btn] },
          [t1]: { id: t1, type: 'text', props: { content: 'Welcome to our product' } },
          [btn]: { id: btn, type: 'button', props: { text: 'Get Started', href: '#' } },
          [s2]: { id: s2, type: 'section', children: [f] },
          [f]: { id: f, type: 'features', children: [c1, c2, c3] },
          [c1]: { id: c1, type: 'container', children: [t2] },
          [c2]: { id: c2, type: 'container', children: [t3] },
          [c3]: { id: c3, type: 'container', children: [t4] },
          [t2]: { id: t2, type: 'text', props: { content: 'Feature 1' } },
          [t3]: { id: t3, type: 'text', props: { content: 'Feature 2' } },
          [t4]: { id: t4, type: 'text', props: { content: 'Feature 3' } },
          [s3]: { id: s3, type: 'section', children: [t5, btn2] },
          [t5]: { id: t5, type: 'text', props: { content: 'Ready to start?' } },
          [btn2]: { id: btn2, type: 'button', props: { text: 'Sign up', href: '#' } },
        },
      };
    })(),
  },
  {
    id: 'simple',
    label: 'Simple',
    description: 'Single section with text and button',
    contentJson: (() => {
      const s = genId();
      const t = genId();
      const b = genId();
      return {
        root: s,
        blocks: {
          [s]: { id: s, type: 'section', children: [t, b] },
          [t]: { id: t, type: 'text', props: { content: 'Your content here' } },
          [b]: { id: b, type: 'button', props: { text: 'Learn more', href: '#' } },
        },
      };
    })(),
  },
];
