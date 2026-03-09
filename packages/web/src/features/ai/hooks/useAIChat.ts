/**
 * Hook that orchestrates the AI chat flow:
 * - Sends messages to the API
 * - Handles streaming responses (SSE with named events)
 * - Extracts mutations from responses
 * - Manages pending mutations for user approval
 */

import { useCallback, useRef } from 'react';
import { useChatStore, type EditorMutation } from '../stores/chat-store';
import { buildPageSummary } from '../page-context';
import { buildSectionMap } from '../section-map';

export interface UseAIChatOptions {
  pageId: string;
  /** Currently selected block ID for context */
  selectedBlockId?: string | null;
  /** Current editor content for building page context */
  contentJson?: Record<string, unknown>;
  /** Page title */
  pageTitle?: string;
}

export function useAIChat({ pageId, selectedBlockId, contentJson, pageTitle }: UseAIChatOptions) {
  const {
    messages,
    isStreaming,
    pendingMutations,
    conversationId,
    addMessage,
    updateLastMessage,
    setStreaming,
    setPendingMutations,
    clearPendingMutations,
    clearHistory,
    newConversation,
  } = useChatStore();

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Add user message
      addMessage({ role: 'user', content: content.trim() });

      // Add empty assistant message for streaming
      addMessage({ role: 'assistant', content: '' });
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Build page context and section map from current editor content
        const editorContent = contentJson as import('@/features/pages/editor/types').EditorContentJson | undefined;
        const pageContext = editorContent
          ? buildPageSummary(editorContent)
          : { sectionCount: 0, blockCount: 0, blockCountByType: {} as Record<string, number>, colorPalette: [] as string[], fontFamilies: [] as string[], imageCount: 0, hasForm: false, layoutMode: 'fluid' as const, textSnippets: [] as { blockId: string; type: string; text: string }[] };
        const sectionMap = editorContent
          ? buildSectionMap(editorContent)
          : [];

        // Build conversation history from existing messages (exclude latest empty assistant msg)
        const conversationHistory = messages
          .filter((m: { content: string }) => m.content.trim() !== '')
          .map((m: { role: string; content: string }) => ({ role: m.role, content: m.content }));

        const response = await fetch('/api/v1/ai/chat', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: content.trim(),
            pageContext,
            sectionMap,
            conversationHistory,
            selectedBlockId: selectedBlockId ?? undefined,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errBody = await response.json().catch(() => ({}));
          throw new Error((errBody as { error?: string }).error ?? `Request failed (${response.status})`);
        }

        let fullText = '';
        let mutations: EditorMutation[] | undefined;

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // Parse SSE: server sends named events like:
            //   event: text\ndata: {"text": "..."}\n\n
            //   event: mutations\ndata: {"mutations": [...]}\n\n
            //   event: done\ndata: {}\n\n
            //   event: error\ndata: {"error": "..."}\n\n
            const blocks = buffer.split('\n\n');
            // Keep the last (possibly incomplete) block in the buffer
            buffer = blocks.pop() ?? '';

            for (const block of blocks) {
              if (!block.trim()) continue;

              let eventType = '';
              let dataStr = '';

              for (const line of block.split('\n')) {
                if (line.startsWith('event: ')) {
                  eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                  dataStr = line.slice(6);
                }
              }

              if (!dataStr) continue;

              try {
                const parsed = JSON.parse(dataStr);

                if (eventType === 'text') {
                  fullText += parsed.text ?? '';
                  updateLastMessage(fullText);
                } else if (eventType === 'mutations') {
                  mutations = parsed.mutations as EditorMutation[];
                } else if (eventType === 'error') {
                  throw new Error(parsed.error ?? 'AI service error');
                }
                // eventType === 'done' — just end of stream, no action needed
              } catch (e) {
                if (e instanceof SyntaxError) {
                  // Partial JSON — ignore
                } else {
                  throw e;
                }
              }
            }
          }
        } else {
          // Non-streaming fallback: read the JSON body
          const json = await response.json();
          fullText = json.content ?? json.message ?? '';
          mutations = json.mutations as EditorMutation[] | undefined;
          updateLastMessage(fullText, mutations);
        }

        // Final update with mutations
        if (mutations?.length) {
          updateLastMessage(fullText, mutations);
          setPendingMutations(mutations);
        }
      } catch (err: unknown) {
        if ((err as Error).name === 'AbortError') {
          const msgs = useChatStore.getState().messages;
          const lastContent = msgs.length > 0 ? msgs[msgs.length - 1].content : '';
          updateLastMessage(lastContent + '\n\n_(cancelled)_');
        } else {
          const errorMsg =
            err instanceof Error ? err.message : 'Something went wrong';
          updateLastMessage(`Sorry, I encountered an error: ${errorMsg}`);
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [
      pageId,
      pageTitle,
      contentJson,
      conversationId,
      selectedBlockId,
      isStreaming,
      messages,
      addMessage,
      updateLastMessage,
      setStreaming,
      setPendingMutations,
    ]
  );

  const cancelStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const approveChanges = useCallback(
    (mutations: EditorMutation[]) => {
      // Caller (AIChatPanel) will handle actually applying via mutation-executor
      clearPendingMutations();
      return mutations;
    },
    [clearPendingMutations]
  );

  const rejectChanges = useCallback(() => {
    clearPendingMutations();
  }, [clearPendingMutations]);

  return {
    messages,
    isStreaming,
    pendingMutations,
    sendMessage,
    cancelStream,
    approveChanges,
    rejectChanges,
    clearHistory,
    newConversation,
  };
}
