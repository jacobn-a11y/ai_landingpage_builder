import { create } from 'zustand';
import type { EditorMutation } from '@/features/pages/editor/mutations/types';

// Re-export the canonical EditorMutation so existing consumers keep working
export type { EditorMutation } from '@/features/pages/editor/mutations/types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  mutations?: EditorMutation[];
  timestamp: number;
}

// ---- State ----

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  conversationId: string;
  pendingMutations: EditorMutation[] | null;

  // Actions
  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  updateLastMessage: (content: string, mutations?: EditorMutation[]) => void;
  setStreaming: (streaming: boolean) => void;
  setPendingMutations: (mutations: EditorMutation[] | null) => void;
  clearPendingMutations: () => void;
  clearHistory: () => void;
  newConversation: () => void;
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export const useChatStore = create<ChatState>((set) => ({
  messages: [],
  isStreaming: false,
  conversationId: generateConversationId(),
  pendingMutations: null,

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        { ...message, id: generateId(), timestamp: Date.now() },
      ],
    })),

  updateLastMessage: (content, mutations) =>
    set((state) => {
      const msgs = [...state.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = {
          ...last,
          content,
          ...(mutations ? { mutations } : {}),
        };
      }
      return { messages: msgs };
    }),

  setStreaming: (streaming) => set({ isStreaming: streaming }),

  setPendingMutations: (mutations) => set({ pendingMutations: mutations }),

  clearPendingMutations: () => set({ pendingMutations: null }),

  clearHistory: () => set({ messages: [], pendingMutations: null }),

  newConversation: () =>
    set({
      messages: [],
      pendingMutations: null,
      conversationId: generateConversationId(),
      isStreaming: false,
    }),
}));
