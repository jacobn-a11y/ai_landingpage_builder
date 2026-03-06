/**
 * Convert a string to a URL-safe slug.
 * Shared utility — keep in sync with packages/web/src/lib/slugify.ts
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function generateUniqueSlug(base: string, existing: string[]): string {
  let slug = slugify(base) || 'page';
  let candidate = slug;
  let n = 1;
  while (existing.includes(candidate)) {
    candidate = `${slug}-${n}`;
    n++;
  }
  return candidate;
}
