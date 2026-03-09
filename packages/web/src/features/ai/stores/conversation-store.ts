/**
 * Block 19: Conversation Store
 *
 * Zustand store with localStorage persistence for managing AI conversations
 * per page. Supports multiple conversations per page with auto-pruning.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, ChatMessage, InspirationProfile } from '../types';

// ---------------------------------------------------------------------------
// Limits
// ---------------------------------------------------------------------------

const MAX_CONVERSATIONS_PER_PAGE = 10;
const MAX_MESSAGES_PER_CONVERSATION = 100;

// ---------------------------------------------------------------------------
// Store state & actions
// ---------------------------------------------------------------------------

export interface ConversationState {
  conversations: Record<string, Conversation[]>;
}

export interface ConversationActions {
  /** Get an existing conversation by ID, or create a new one for the given page. */
  getOrCreateConversation: (pageId: string, conversationId?: string) => Conversation;

  /** Add a message to a specific conversation. Auto-prunes old messages. */
  addMessage: (pageId: string, conversationId: string, message: Omit<ChatMessage, 'timestamp'>) => void;

  /** Attach an inspiration profile to a conversation. */
  addInspirationProfile: (pageId: string, conversationId: string, profile: InspirationProfile) => void;

  /** Clear a specific conversation (removes it entirely). */
  clearConversation: (pageId: string, conversationId: string) => void;

  /** Clear all conversations for a page. */
  clearPageConversations: (pageId: string) => void;

  /** Get all conversations for a page. */
  getPageConversations: (pageId: string) => Conversation[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function createConversation(pageId: string): Conversation {
  const now = Date.now();
  return {
    id: generateId(),
    pageId,
    messages: [],
    inspirationProfiles: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Prune conversations for a page to stay under the limit.
 * Removes the oldest conversations first (by updatedAt).
 */
function pruneConversations(convos: Conversation[]): Conversation[] {
  if (convos.length <= MAX_CONVERSATIONS_PER_PAGE) return convos;
  const sorted = [...convos].sort((a, b) => b.updatedAt - a.updatedAt);
  return sorted.slice(0, MAX_CONVERSATIONS_PER_PAGE);
}

/**
 * Prune messages in a conversation to stay under the limit.
 * Keeps the most recent messages.
 */
function pruneMessages(messages: ChatMessage[]): ChatMessage[] {
  if (messages.length <= MAX_MESSAGES_PER_CONVERSATION) return messages;
  return messages.slice(messages.length - MAX_MESSAGES_PER_CONVERSATION);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useConversationStore = create<ConversationState & ConversationActions>()(
  persist(
    (set, get) => ({
      conversations: {},

      getOrCreateConversation(pageId: string, conversationId?: string): Conversation {
        const state = get();
        const pageConvos = state.conversations[pageId] ?? [];

        // Return existing if found
        if (conversationId) {
          const existing = pageConvos.find((c) => c.id === conversationId);
          if (existing) return existing;
        }

        // Create new
        const newConvo = createConversation(pageId);
        const updated = pruneConversations([newConvo, ...pageConvos]);

        set({
          conversations: {
            ...state.conversations,
            [pageId]: updated,
          },
        });

        return newConvo;
      },

      addMessage(pageId: string, conversationId: string, message: Omit<ChatMessage, 'timestamp'>) {
        set((state) => {
          const pageConvos = state.conversations[pageId] ?? [];
          const idx = pageConvos.findIndex((c) => c.id === conversationId);
          if (idx === -1) return state;

          const convo = pageConvos[idx];
          const newMessage: ChatMessage = {
            ...message,
            timestamp: Date.now(),
          };

          const updatedConvo: Conversation = {
            ...convo,
            messages: pruneMessages([...convo.messages, newMessage]),
            updatedAt: Date.now(),
          };

          const updatedConvos = [...pageConvos];
          updatedConvos[idx] = updatedConvo;

          return {
            conversations: {
              ...state.conversations,
              [pageId]: updatedConvos,
            },
          };
        });
      },

      addInspirationProfile(pageId: string, conversationId: string, profile: InspirationProfile) {
        set((state) => {
          const pageConvos = state.conversations[pageId] ?? [];
          const idx = pageConvos.findIndex((c) => c.id === conversationId);
          if (idx === -1) return state;

          const convo = pageConvos[idx];
          const updatedConvo: Conversation = {
            ...convo,
            inspirationProfiles: [...convo.inspirationProfiles, profile],
            updatedAt: Date.now(),
          };

          const updatedConvos = [...pageConvos];
          updatedConvos[idx] = updatedConvo;

          return {
            conversations: {
              ...state.conversations,
              [pageId]: updatedConvos,
            },
          };
        });
      },

      clearConversation(pageId: string, conversationId: string) {
        set((state) => {
          const pageConvos = state.conversations[pageId] ?? [];
          return {
            conversations: {
              ...state.conversations,
              [pageId]: pageConvos.filter((c) => c.id !== conversationId),
            },
          };
        });
      },

      clearPageConversations(pageId: string) {
        set((state) => {
          const updated = { ...state.conversations };
          delete updated[pageId];
          return { conversations: updated };
        });
      },

      getPageConversations(pageId: string): Conversation[] {
        return get().conversations[pageId] ?? [];
      },
    }),
    {
      name: 'ai-conversations',
      version: 1,
    },
  ),
);
