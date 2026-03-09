/**
 * Block 16: File Upload Analysis
 *
 * Analyzes uploaded images/PDFs using Claude vision to extract
 * design inspiration profiles (colors, typography, layout, etc.).
 */

import { createHash } from 'crypto';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InspirationProfile {
  id: string;
  fileName: string;
  fileType: 'image' | 'pdf';
  analysis: {
    colorPalette: string[];
    typographyFeel: string;
    spacingDensity: 'compact' | 'comfortable' | 'spacious';
    layoutStyle: string;
    contentTone: string;
    keyElements: string[];
  };
  analyzedAt: number;
}

// ---------------------------------------------------------------------------
// Cache (in-memory, 1 hr TTL)
// ---------------------------------------------------------------------------

interface CacheEntry {
  profile: InspirationProfile;
  expiresAt: number;
}

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const analysisCache = new Map<string, CacheEntry>();

function hashBuffer(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function getCached(hash: string): InspirationProfile | null {
  const entry = analysisCache.get(hash);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    analysisCache.delete(hash);
    return null;
  }
  return entry.profile;
}

function setCache(hash: string, profile: InspirationProfile): void {
  analysisCache.set(hash, { profile, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Exposed for testing – clears every cached entry. */
export function clearAnalysisCache(): void {
  analysisCache.clear();
}

// ---------------------------------------------------------------------------
// Analysis prompt
// ---------------------------------------------------------------------------

const ANALYSIS_SYSTEM_PROMPT = `You are a design analysis expert. Analyze the provided image and extract a structured design profile. Respond ONLY with valid JSON matching this schema:

{
  "colorPalette": ["#hex1", "#hex2", ...],  // 3-8 dominant colors as hex codes
  "typographyFeel": "string",               // e.g. "modern sans-serif", "classic serif", "playful handwritten"
  "spacingDensity": "compact" | "comfortable" | "spacious",
  "layoutStyle": "string",                  // e.g. "single column hero", "grid-based", "asymmetric"
  "contentTone": "string",                  // e.g. "professional", "casual", "luxury", "playful"
  "keyElements": ["string", ...]            // notable UI elements: "large hero image", "sticky nav", "CTA button", etc.
}

Be precise with hex colors. Keep strings concise (2-5 words each). Return 3-6 key elements.`;

// ---------------------------------------------------------------------------
// Main analysis function
// ---------------------------------------------------------------------------

export async function analyzeFile(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  apiKey: string,
): Promise<InspirationProfile> {
  const contentHash = hashBuffer(fileBuffer);

  // Check cache first
  const cached = getCached(contentHash);
  if (cached) return { ...cached, fileName };

  // Determine media type for Claude vision
  const normalizedType = fileType.toLowerCase();
  let mediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  let resolvedFileType: 'image' | 'pdf';

  if (normalizedType.includes('pdf')) {
    // For PDF we still send as image – the caller should rasterise first.
    // Fallback: treat the raw bytes as PNG (pre-converted by caller).
    mediaType = 'image/png';
    resolvedFileType = 'pdf';
  } else if (normalizedType.includes('png')) {
    mediaType = 'image/png';
    resolvedFileType = 'image';
  } else if (normalizedType.includes('jpg') || normalizedType.includes('jpeg')) {
    mediaType = 'image/jpeg';
    resolvedFileType = 'image';
  } else if (normalizedType.includes('webp')) {
    mediaType = 'image/webp';
    resolvedFileType = 'image';
  } else {
    mediaType = 'image/png';
    resolvedFileType = 'image';
  }

  const base64 = fileBuffer.toString('base64');

  // Dynamic import to avoid hard dep when SDK is missing at compile time.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: 'Analyze this design and return the JSON profile.',
          },
        ],
      },
    ],
  });

  // Extract text from response
  const textBlock = response.content.find(
    (b): b is { type: 'text'; text: string } => b.type === 'text',
  );
  if (!textBlock) {
    throw new Error('No text response from analysis model');
  }

  // Parse JSON (strip markdown fences if present)
  let jsonStr = textBlock.text.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  const analysis = JSON.parse(jsonStr) as InspirationProfile['analysis'];

  // Validate required fields & normalise
  if (!Array.isArray(analysis.colorPalette) || analysis.colorPalette.length === 0) {
    throw new Error('Invalid analysis: missing colorPalette');
  }
  if (!['compact', 'comfortable', 'spacious'].includes(analysis.spacingDensity)) {
    analysis.spacingDensity = 'comfortable';
  }

  const profile: InspirationProfile = {
    id: contentHash.slice(0, 12),
    fileName,
    fileType: resolvedFileType,
    analysis,
    analyzedAt: Date.now(),
  };

  setCache(contentHash, profile);
  return profile;
}
