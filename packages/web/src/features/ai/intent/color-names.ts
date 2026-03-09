/**
 * Color Names — Block 7
 *
 * Maps 30+ common color names to hex values based on the Tailwind
 * color palette (500-weight by default).
 */

export const COLOR_NAMES: Record<string, string> = {
  // Grays
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  grey: '#6B7280',
  slate: '#64748B',
  zinc: '#71717A',
  neutral: '#737373',
  stone: '#78716C',

  // Warm
  red: '#EF4444',
  orange: '#F97316',
  amber: '#F59E0B',
  yellow: '#EAB308',

  // Green
  lime: '#84CC16',
  green: '#22C55E',
  emerald: '#10B981',
  teal: '#14B8A6',

  // Blue
  cyan: '#06B6D4',
  sky: '#0EA5E9',
  blue: '#3B82F6',
  indigo: '#6366F1',
  navy: '#1E3A5F',

  // Purple / Pink
  violet: '#8B5CF6',
  purple: '#A855F7',
  fuchsia: '#D946EF',
  pink: '#EC4899',
  rose: '#F43F5E',
  magenta: '#D946EF',

  // Earth tones
  brown: '#92400E',
  tan: '#D2B48C',
  beige: '#F5F5DC',
  ivory: '#FFFFF0',
  coral: '#FF7F50',
  salmon: '#FA8072',
  maroon: '#800000',
  crimson: '#DC143C',
  gold: '#FFD700',
  silver: '#C0C0C0',

  // Transparent
  transparent: 'transparent',
};

/**
 * Resolve a user-supplied color reference to a hex value.
 *
 * Accepts:
 *  - A known color name ("red", "sky blue" → "sky")
 *  - A hex string ("#FF0000" or "FF0000")
 *  - Returns `null` if unresolvable
 */
export function resolveColor(input: string): string | null {
  const trimmed = input.trim().toLowerCase();

  // Direct hex
  if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
    return trimmed.toUpperCase();
  }

  // Hex without hash
  if (/^[0-9a-f]{6}$/i.test(trimmed)) {
    return `#${trimmed.toUpperCase()}`;
  }

  // Named color lookup
  const mapped = COLOR_NAMES[trimmed];
  if (mapped) return mapped;

  // Try compound names: "light blue" → "sky", "dark red" → "rose"
  // Also handle "sky blue" etc. by trying last word then first word
  const words = trimmed.split(/\s+/);
  for (const word of words) {
    const hit = COLOR_NAMES[word];
    if (hit) return hit;
  }

  return null;
}
