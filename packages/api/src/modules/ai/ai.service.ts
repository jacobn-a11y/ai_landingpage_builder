/**
 * AI Service — orchestrates Claude API calls with streaming,
 * tool use, and mutation generation.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ChatMessage,
  ChatStreamChunk,
  EditorMutation,
  PageSummary,
  SectionMapEntry,
} from './ai.types.js';
import { buildSystemPrompt } from './prompts.js';
import { getAllTools, executeTool } from './tools/index.js';

// -------------------------------------------------------------------------
// Constants
// -------------------------------------------------------------------------

const MODEL = 'claude-sonnet-4-20250514';
const MAX_INPUT_TOKENS = 4000;
const MAX_OUTPUT_TOKENS = 4000;
const MAX_TOOL_ROUNDS = 5;

// -------------------------------------------------------------------------
// Singleton client
// -------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

/** Reset client (for tests). */
export function resetClient(): void {
  _client = null;
}

// -------------------------------------------------------------------------
// Conversation formatting
// -------------------------------------------------------------------------

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown; tool_use_id?: string; content?: string }>;
}

function buildMessages(
  conversationHistory: ChatMessage[],
  userMessage: string,
): AnthropicMessage[] {
  const messages: AnthropicMessage[] = [];

  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role,
      content: msg.content,
    });
  }

  messages.push({
    role: 'user',
    content: userMessage,
  });

  return messages;
}

// -------------------------------------------------------------------------
// AI Service class
// -------------------------------------------------------------------------

export class AIService {
  /**
   * Stream a chat response from Claude.
   * Yields text chunks and mutation batches as they become available.
   */
  async *chat(params: {
    message: string;
    pageContext: PageSummary;
    sectionMap: SectionMapEntry[];
    conversationHistory?: ChatMessage[];
    selectedBlockId?: string;
  }): AsyncGenerator<ChatStreamChunk> {
    const client = getClient();

    const systemPrompt = buildSystemPrompt(
      params.pageContext,
      params.sectionMap,
      params.selectedBlockId,
    );

    const messages = buildMessages(
      params.conversationHistory ?? [],
      params.message,
    );

    const tools = getAllTools();

    // Agentic loop: Claude may call tools, we execute them and feed results back
    let currentMessages = messages;
    let toolRound = 0;

    while (toolRound < MAX_TOOL_ROUNDS) {
      toolRound += 1;

      const collectedText: string[] = [];
      const toolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

      // Stream the response
      const stream = client.messages.stream({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        system: systemPrompt,
        messages: currentMessages as Anthropic.MessageParam[],
        tools: tools as Anthropic.Tool[],
      });

      // Process stream events
      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; text?: string; partial_json?: string };
          if (delta.type === 'text_delta' && delta.text) {
            collectedText.push(delta.text);
            yield { type: 'text', data: delta.text };
          }
        }

        if (event.type === 'content_block_start') {
          const block = event.content_block as { type: string; id?: string; name?: string };
          if (block.type === 'tool_use' && block.id && block.name) {
            toolUses.push({ id: block.id, name: block.name, input: {} });
          }
        }

        if (event.type === 'content_block_delta') {
          const delta = event.delta as { type: string; partial_json?: string };
          if (delta.type === 'input_json_delta' && delta.partial_json && toolUses.length > 0) {
            // The SDK accumulates partial JSON; we'll get final input from finalMessage
          }
        }
      }

      // Get the final complete message for tool inputs
      const finalMessage = await stream.finalMessage();

      // Extract complete tool use inputs from the final message
      const completeToolUses: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];
      for (const block of finalMessage.content) {
        if (block.type === 'tool_use') {
          completeToolUses.push({
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          });
        }
      }

      // If no tool uses, we're done
      if (completeToolUses.length === 0) {
        break;
      }

      // Execute tools and collect mutations
      const allMutations: EditorMutation[] = [];
      const toolResults: Array<{ type: 'tool_result'; tool_use_id: string; content: string }> = [];

      for (const toolUse of completeToolUses) {
        try {
          const mutations = executeTool(
            toolUse.name,
            toolUse.input,
            params.pageContext,
            params.sectionMap,
          );
          allMutations.push(...mutations);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({
              success: true,
              mutationCount: mutations.length,
              mutations: mutations.map((m) => ({ type: m.type })),
            }),
          });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ success: false, error: errMsg }),
          });
        }
      }

      // Yield accumulated mutations
      if (allMutations.length > 0) {
        yield { type: 'mutations', data: allMutations };
      }

      // Check stop reason — if end_turn, we're done even if tools were called
      if (finalMessage.stop_reason === 'end_turn') {
        break;
      }

      // Continue the conversation with tool results
      currentMessages = [
        ...currentMessages,
        {
          role: 'assistant' as const,
          content: finalMessage.content as AnthropicMessage['content'],
        },
        {
          role: 'user' as const,
          content: toolResults as AnthropicMessage['content'],
        },
      ];
    }
  }
}

// Export singleton instance
export const aiService = new AIService();
