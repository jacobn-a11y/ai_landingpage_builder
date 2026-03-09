/**
 * Hook that orchestrates the AI chat flow:
 * - Sends messages to the API
 * - Handles streaming responses
 * - Extracts mutations from responses
 * - Manages pending mutations for user approval
 */

import { useCallback, useRef } from 'react';
import { useChatStore, type EditorMutation } from '../stores/chat-store';
import { api } from '@/lib/api';

export interface UseAIChatOptions {
  pageId: string;
  /** Currently selected block ID for context */
  selectedBlockId?: string | null;
}

export function useAIChat({ pageId, selectedBlockId }: UseAIChatOptions) {
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
        const response = await api.ai.chat({
          pageId,
          conversationId,
          message: content.trim(),
          selectedBlockId: selectedBlockId ?? undefined,
          signal: controller.signal,
        });

        let fullText = '';
        let mutations: EditorMutation[] | undefined;

        if (response.body) {
          const reader = response.body.getReader();
          const decoder = new TextDecoder();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });

            // Parse SSE-style lines
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (!line.trim()) continue;

              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'text') {
                    fullText += parsed.content ?? '';
                    updateLastMessage(fullText);
                  } else if (parsed.type === 'mutations') {
                    mutations = parsed.mutations as EditorMutation[];
                  }
                } catch {
                  // Partial chunk or not JSON — append as raw text
                  fullText += data;
                  updateLastMessage(fullText);
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
      conversationId,
      selectedBlockId,
      isStreaming,
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
