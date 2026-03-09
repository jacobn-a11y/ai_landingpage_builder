import type { EditorContentJson } from '../types';

export type QualityIssueSeverity = 'warning' | 'error';

export interface QualityIssue {
  id: string;
  severity: QualityIssueSeverity;
  message: string;
  blockId?: string;
}

function isLikelyUnsafeUrl(url: string): boolean {
  const normalized = url.trim().replace(/\s+/g, '').toLowerCase();
  return (
    normalized.startsWith('javascript:') ||
    normalized.startsWith('vbscript:') ||
    normalized.startsWith('data:text/html')
  );
}

function intersects(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number }
): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export function validatePageQuality(content: EditorContentJson): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const blocks = content.blocks ?? {};

  if (!content.root || !blocks[content.root]) {
    issues.push({
      id: 'root-missing',
      severity: 'error',
      message: 'Page root is missing or invalid.',
    });
  }

  Object.values(blocks).forEach((block) => {
    const props = (block.props ?? {}) as Record<string, unknown>;

    if (block.type === 'image') {
      const src = String(props.src ?? '').trim();
      const alt = String(props.alt ?? '').trim();
      if (!src) {
        issues.push({
          id: `img-src-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Image source URL is missing.',
        });
      } else if (isLikelyUnsafeUrl(src)) {
        issues.push({
          id: `img-src-unsafe-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Image source URL is unsafe.',
        });
      }
      if (!alt) {
        issues.push({
          id: `img-alt-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          message: 'Image is missing alt text.',
        });
      }
    }

    if (block.type === 'video') {
      const url = String(props.url ?? '').trim();
      if (!url) {
        issues.push({
          id: `video-url-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          message: 'Video URL is missing.',
        });
      } else if (isLikelyUnsafeUrl(url)) {
        issues.push({
          id: `video-url-unsafe-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Video URL is unsafe.',
        });
      }
    }

    if (block.type === 'button') {
      const text = String(props.text ?? '').trim();
      const href = String(props.href ?? '').trim();
      if (!text) {
        issues.push({
          id: `btn-text-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Button text is empty.',
        });
      }
      if (!href || isLikelyUnsafeUrl(href)) {
        issues.push({
          id: `btn-link-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Button link is missing or unsafe.',
        });
      }
    }

    if (block.type === 'customHtml') {
      const html = String(props.html ?? '');
      if (/<script[\s>]/i.test(html) || /\son\w+\s*=/i.test(html) || /javascript\s*:/i.test(html)) {
        issues.push({
          id: `html-unsafe-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Custom HTML contains potentially unsafe markup.',
        });
      }
    }

    if (block.type === 'form') {
      const formId = String(props.formId ?? '').trim();
      const fields = Array.isArray(props.fields) ? props.fields : [];
      if (!formId && fields.length === 0) {
        issues.push({
          id: `form-unconfigured-${block.id}`,
          severity: 'warning',
          blockId: block.id,
          message: 'Form is not configured with a mapped form ID or local fields.',
        });
      }
      const redirectUrl = String(props.redirectUrl ?? '').trim();
      if (redirectUrl && isLikelyUnsafeUrl(redirectUrl)) {
        issues.push({
          id: `form-redirect-unsafe-${block.id}`,
          severity: 'error',
          blockId: block.id,
          message: 'Form redirect URL is unsafe.',
        });
      }

      if (fields.length > 0) {
        fields.forEach((field, index) => {
          const record = (field ?? {}) as Record<string, unknown>;
          const fieldId = String(record.id ?? '').trim();
          const fieldType = String(record.type ?? '').trim();
          if (!fieldId || !fieldType) {
            issues.push({
              id: `form-field-invalid-${block.id}-${index}`,
              severity: 'error',
              blockId: block.id,
              message: `Form field #${index + 1} is missing id or type.`,
            });
          }
        });
      }
    }
  });

  if (content.layoutMode === 'canvas' && content.root && blocks[content.root]) {
    const rootChildren = blocks[content.root].children ?? [];
    const boxes = rootChildren
      .map((id) => {
        const block = blocks[id];
        if (!block) return null;
        const p = (block.props ?? {}) as Record<string, unknown>;
        return {
          id,
          x: (p.x as number) ?? 0,
          y: (p.y as number) ?? 0,
          w: (p.width as number) ?? 200,
          h: (p.height as number) ?? 80,
        };
      })
      .filter((box): box is { id: string; x: number; y: number; w: number; h: number } => Boolean(box));

    for (let i = 0; i < boxes.length; i += 1) {
      if (boxes[i].w < 24 || boxes[i].h < 24) {
        issues.push({
          id: `size-too-small-${boxes[i].id}`,
          severity: 'warning',
          blockId: boxes[i].id,
          message: 'Block size is very small and may be hard to interact with.',
        });
      }
      if (boxes[i].x < 0 || boxes[i].y < 0) {
        issues.push({
          id: `off-canvas-${boxes[i].id}`,
          severity: 'error',
          blockId: boxes[i].id,
          message: 'Block is positioned outside the canvas bounds.',
        });
      }
      for (let j = i + 1; j < boxes.length; j += 1) {
        if (intersects(boxes[i], boxes[j])) {
          issues.push({
            id: `overlap-${boxes[i].id}-${boxes[j].id}`,
            severity: 'warning',
            blockId: boxes[j].id,
            message: `Block overlaps with another canvas block (${boxes[i].id}).`,
          });
        }
      }
    }
  }

  Object.values(blocks).forEach((block) => {
    if (block.type !== 'button') return;
    const props = (block.props ?? {}) as Record<string, unknown>;
    const overrides = (props.overrides ?? {}) as Record<string, Record<string, unknown>>;
    const mobile = overrides.mobile ?? {};
    const width = typeof mobile.width === 'number' ? mobile.width : typeof props.width === 'number' ? props.width : 200;
    const height = typeof mobile.height === 'number' ? mobile.height : typeof props.height === 'number' ? props.height : 40;
    if (width < 44 || height < 44) {
      issues.push({
        id: `mobile-touch-${block.id}`,
        severity: 'warning',
        blockId: block.id,
        message: 'Button touch target is smaller than 44x44 on mobile.',
      });
    }
  });

  return issues;
}
