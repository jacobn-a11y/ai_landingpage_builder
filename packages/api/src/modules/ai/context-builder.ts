/**
 * Block 19: Context Builder
 *
 * Constructs a context window for the AI assistant by assembling a system
 * prompt and conversation history within a token budget.
 *
 * Priority order:
 *   1. System prompt (always included)
 *   2. Last 3 messages (most recent context)
 *   3. Older messages (summarised if needed)
 *   4. Inspiration profile (if provided)
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp?: number;
}

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

export interface PageContext {
  pageId: string;
  title: string;
  blockCount: number;
  sectionCount: number;
  layoutMode?: string;
  fontFamily?: string;
  primaryColor?: string;
}

export interface SectionMap {
  [sectionId: string]: {
    type: string;
    childCount: number;
    label?: string;
  };
}

export interface BuildContextParams {
  pageContext: PageContext;
  sectionMap: SectionMap;
  conversationHistory: ChatMessage[];
  inspirationProfile?: InspirationProfile;
  /** Target max tokens for the full context window. Default 8000. */
  maxTokens?: number;
}

export interface BuiltContext {
  systemPrompt: string;
  messages: ChatMessage[];
}

// ---------------------------------------------------------------------------
// Token estimation
// ---------------------------------------------------------------------------

/** Rough token estimate: ~4 characters per token. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function messageTokens(msg: ChatMessage): number {
  // Role overhead ~4 tokens + content
  return 4 + estimateTokens(msg.content);
}

// ---------------------------------------------------------------------------
// System prompt builder
// ---------------------------------------------------------------------------

function buildSystemPrompt(
  pageContext: PageContext,
  sectionMap: SectionMap,
): string {
  const sections = Object.entries(sectionMap);
  const sectionList =
    sections.length > 0
      ? sections
          .map(
            ([id, info]) =>
              `  - ${info.label ?? info.type} (${id}): ${info.childCount} children`,
          )
          .join('\n')
      : '  (no sections)';

  return `You are an AI landing page assistant. You help users edit and improve their landing pages.

Current page: "${pageContext.title}" (${pageContext.pageId})
Layout: ${pageContext.layoutMode ?? 'fluid'}
Font: ${pageContext.fontFamily ?? 'default'}
Primary color: ${pageContext.primaryColor ?? 'not set'}
Blocks: ${pageContext.blockCount} total, ${pageContext.sectionCount} sections

Page structure:
${sectionList}

Rules:
- Respond with specific, actionable block mutations when the user asks for edits.
- Keep responses concise and focused on the user's request.
- Do not remove blocks unless explicitly asked.
- Maintain the existing design language unless asked to change it.`;
}

// ---------------------------------------------------------------------------
// Inspiration profile snippet
// ---------------------------------------------------------------------------

function buildInspirationSnippet(profile: InspirationProfile): string {
  const a = profile.analysis;
  return `Design inspiration (from "${profile.fileName}"):
- Colors: ${a.colorPalette.join(', ')}
- Typography: ${a.typographyFeel}
- Spacing: ${a.spacingDensity}
- Layout: ${a.layoutStyle}
- Tone: ${a.contentTone}
- Key elements: ${a.keyElements.join(', ')}`;
}

// ---------------------------------------------------------------------------
// Message summarisation (simple truncation)
// ---------------------------------------------------------------------------

function summarizeMessages(messages: ChatMessage[]): ChatMessage {
  const summaryParts = messages.map(
    (m) =>
      `[${m.role}]: ${m.content.length > 120 ? m.content.slice(0, 120) + '...' : m.content}`,
  );
  return {
    role: 'system',
    content: `Previous conversation summary:\n${summaryParts.join('\n')}`,
  };
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildContextWindow(params: BuildContextParams): BuiltContext {
  const {
    pageContext,
    sectionMap,
    conversationHistory,
    inspirationProfile,
    maxTokens = 8000,
  } = params;

  // 1. Build system prompt (always included)
  let systemPrompt = buildSystemPrompt(pageContext, sectionMap);

  // Add inspiration if provided
  if (inspirationProfile) {
    const snippet = buildInspirationSnippet(inspirationProfile);
    systemPrompt += '\n\n' + snippet;
  }

  const systemTokens = estimateTokens(systemPrompt);
  let remainingTokens = maxTokens - systemTokens;

  if (remainingTokens <= 0) {
    // System prompt alone exceeds budget – truncate it
    const truncated = systemPrompt.slice(0, maxTokens * 4);
    return { systemPrompt: truncated, messages: [] };
  }

  // 2. Last 3 messages (highest priority)
  const recentMessages = conversationHistory.slice(-3);
  const olderMessages = conversationHistory.slice(0, -3);

  const outputMessages: ChatMessage[] = [];

  // 3. Try to fit older messages as a summary
  if (olderMessages.length > 0) {
    const summary = summarizeMessages(olderMessages);
    const summaryTokens = messageTokens(summary);
    if (summaryTokens <= remainingTokens * 0.3) {
      // Allocate at most 30% of remaining budget to summary
      outputMessages.push(summary);
      remainingTokens -= summaryTokens;
    }
  }

  // 4. Add recent messages (most recent first priority, but output in order)
  for (const msg of recentMessages) {
    const tokens = messageTokens(msg);
    if (tokens <= remainingTokens) {
      outputMessages.push(msg);
      remainingTokens -= tokens;
    } else {
      // Truncate the message to fit
      const availableChars = Math.max(0, remainingTokens * 4 - 16); // 16 for overhead
      if (availableChars > 50) {
        outputMessages.push({
          ...msg,
          content: msg.content.slice(0, availableChars) + '...',
        });
      }
      break;
    }
  }

  return { systemPrompt, messages: outputMessages };
}
