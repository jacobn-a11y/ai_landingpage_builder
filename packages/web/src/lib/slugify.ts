/**
 * Convert a string to a URL-safe slug.
 * Shared utility — keep in sync with packages/api/src/shared/slugify.ts
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || 'page';
}
