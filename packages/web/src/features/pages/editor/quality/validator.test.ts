import { describe, expect, it } from 'vitest';
import { validatePageQuality } from './validator';

describe('page quality validator', () => {
  it('flags missing alt text and unsafe button url', () => {
    const issues = validatePageQuality({
      schemaVersion: 1,
      root: 'root',
      layoutMode: 'fluid',
      blocks: {
        root: { id: 'root', type: 'section', children: ['img1', 'img2', 'btn1', 'video1'] },
        img1: { id: 'img1', type: 'image', props: { src: '', alt: '' } },
        img2: { id: 'img2', type: 'image', props: { src: 'https://cdn.example.com/a.jpg', alt: '' } },
        btn1: { id: 'btn1', type: 'button', props: { text: 'Go', href: 'javascript:alert(1)' } },
        video1: { id: 'video1', type: 'video', props: { url: 'javascript:alert(1)' } },
      },
    });
    expect(issues.some((i) => i.id.startsWith('img-src-') && i.severity === 'error')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('img-alt-'))).toBe(true);
    expect(issues.some((i) => i.id.startsWith('btn-link-'))).toBe(true);
    expect(issues.some((i) => i.id.startsWith('video-url-unsafe-'))).toBe(true);
  });

  it('flags overlapping canvas blocks', () => {
    const issues = validatePageQuality({
      schemaVersion: 1,
      root: 'root',
      layoutMode: 'canvas',
      blocks: {
        root: { id: 'root', type: 'section', children: ['a', 'b', 'btn1'] },
        a: { id: 'a', type: 'paragraph', props: { x: 0, y: 0, width: 200, height: 80 } },
        b: { id: 'b', type: 'paragraph', props: { x: 100, y: 40, width: 220, height: 90 } },
        btn1: { id: 'btn1', type: 'button', props: { text: 'Go', href: '/go', overrides: { mobile: { width: 40, height: 30 } } } },
      },
    });
    expect(issues.some((i) => i.id.startsWith('overlap-'))).toBe(true);
    expect(issues.some((i) => i.id.startsWith('mobile-touch-'))).toBe(true);
  });

  it('flags unconfigured form blocks and unsafe redirects', () => {
    const issues = validatePageQuality({
      schemaVersion: 1,
      root: 'root',
      layoutMode: 'fluid',
      blocks: {
        root: { id: 'root', type: 'section', children: ['form1'] },
        form1: { id: 'form1', type: 'form', props: { redirectUrl: 'javascript:alert(1)' } },
      },
    });
    expect(issues.some((i) => i.id.startsWith('form-unconfigured-'))).toBe(true);
    expect(issues.some((i) => i.id.startsWith('form-redirect-unsafe-'))).toBe(true);
  });

  it('flags blocking content and layout issues', () => {
    const issues = validatePageQuality({
      schemaVersion: 1,
      root: 'root',
      layoutMode: 'canvas',
      blocks: {
        root: { id: 'root', type: 'section', children: ['btn1', 'txt1', 'form1'] },
        btn1: { id: 'btn1', type: 'button', props: { text: '', href: '' } },
        txt1: { id: 'txt1', type: 'headline', props: { x: -12, y: 20, width: 120, height: 40, content: '' } },
        form1: { id: 'form1', type: 'form', props: { fields: [{ id: '', type: 'email' }] } },
      },
    });

    expect(issues.some((i) => i.id.startsWith('btn-text-') && i.severity === 'error')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('btn-link-') && i.severity === 'error')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('off-canvas-') && i.severity === 'error')).toBe(true);
    expect(issues.some((i) => i.id.startsWith('form-field-invalid-') && i.severity === 'error')).toBe(true);
  });
});
