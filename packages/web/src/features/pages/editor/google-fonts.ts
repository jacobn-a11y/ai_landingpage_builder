/**
 * Google Fonts loader. Dynamically loads font families via the Google Fonts CSS API.
 * Caches loaded fonts to avoid duplicate requests.
 */

const loadedFonts = new Set<string>();

const GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2';

/**
 * Load a Google Font family. No-op if already loaded or if it's a system font.
 */
export function loadGoogleFont(family: string): void {
  if (!family || loadedFonts.has(family)) return;

  // Skip system fonts
  const systemFonts = ['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'serif', 'sans-serif', 'monospace'];
  if (systemFonts.includes(family)) {
    loadedFonts.add(family);
    return;
  }

  loadedFonts.add(family);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${GOOGLE_FONTS_URL}?family=${encodeURIComponent(family)}:wght@300;400;500;600;700;800;900&display=swap`;
  document.head.appendChild(link);
}

/**
 * Load multiple Google Font families at once.
 */
export function loadGoogleFonts(families: string[]): void {
  const toLoad = families.filter((f) => f && !loadedFonts.has(f));
  if (toLoad.length === 0) return;

  const systemFonts = new Set(['Arial', 'Helvetica', 'Georgia', 'Times New Roman', 'Verdana', 'Courier New', 'serif', 'sans-serif', 'monospace']);
  const googleFonts = toLoad.filter((f) => !systemFonts.has(f));

  toLoad.forEach((f) => loadedFonts.add(f));

  if (googleFonts.length === 0) return;

  const familyParams = googleFonts
    .map((f) => `family=${encodeURIComponent(f)}:wght@300;400;500;600;700;800;900`)
    .join('&');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `${GOOGLE_FONTS_URL}?${familyParams}&display=swap`;
  document.head.appendChild(link);
}

/**
 * Preload popular Google Fonts used in the font picker dropdown.
 */
export const POPULAR_GOOGLE_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Raleway',
  'Nunito', 'Source Sans Pro', 'PT Sans', 'Merriweather', 'Playfair Display',
  'Oswald', 'Ubuntu', 'Rubik', 'Work Sans', 'DM Sans', 'Barlow', 'Fira Sans',
  'Libre Franklin', 'Noto Sans', 'Quicksand', 'Mukta', 'Cabin', 'Karla',
  'Manrope', 'Space Grotesk', 'Outfit', 'Plus Jakarta Sans', 'Sora',
];
