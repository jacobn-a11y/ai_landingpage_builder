/**
 * Block 19: Conversation History
 *
 * Dropdown UI that lists past AI conversations for the current page.
 * Shows date + first message preview, with options to load, create new,
 * or clear conversations.
 */

import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useConversationStore } from './stores/conversation-store';
import type { Conversation } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ConversationHistoryProps {
  pageId: string;
  /** Currently active conversation ID */
  activeConversationId?: string;
  /** Called when a conversation is selected to load */
  onSelect: (conversation: Conversation) => void;
  /** Called when "New conversation" is clicked */
  onNew: (conversation: Conversation) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPreview(conversation: Conversation): string {
  const firstUserMsg = conversation.messages.find((m) => m.role === 'user');
  if (!firstUserMsg) return 'Empty conversation';
  const text = firstUserMsg.content.replace(/<[^>]*>/g, '').trim();
  return text.length > 60 ? text.slice(0, 57) + '...' : text;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ConversationHistory({
  pageId,
  activeConversationId,
  onSelect,
  onNew,
}: ConversationHistoryProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getPageConversations = useConversationStore((s) => s.getPageConversations);
  const getOrCreateConversation = useConversationStore((s) => s.getOrCreateConversation);
  const clearConversation = useConversationStore((s) => s.clearConversation);
  const clearPageConversations = useConversationStore((s) => s.clearPageConversations);

  const conversations = useMemo(() => {
    const convos = getPageConversations(pageId);
    // Sort by updatedAt descending
    return [...convos].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [getPageConversations, pageId]);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleNew = useCallback(() => {
    const convo = getOrCreateConversation(pageId);
    onNew(convo);
    setOpen(false);
  }, [pageId, getOrCreateConversation, onNew]);

  const handleSelect = useCallback(
    (convo: Conversation) => {
      onSelect(convo);
      setOpen(false);
    },
    [onSelect],
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent, conversationId: string) => {
      e.stopPropagation();
      clearConversation(pageId, conversationId);
    },
    [pageId, clearConversation],
  );

  const handleClearAll = useCallback(() => {
    clearPageConversations(pageId);
    setOpen(false);
  }, [pageId, clearPageConversations]);

  return (
    <div ref={dropdownRef} className="relative">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className="flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        {/* Chat icon */}
        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
        </svg>
        History
        {conversations.length > 0 && (
          <span className="inline-flex items-center justify-center h-4 min-w-[16px] rounded-full bg-gray-200 px-1 text-xs text-gray-600">
            {conversations.length}
          </span>
        )}
        {/* Chevron */}
        <svg
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-1 w-80 rounded-lg border border-gray-200 bg-white shadow-lg z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Conversations
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={handleNew}
                className="rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
              >
                + New
              </button>
              {conversations.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="rounded px-2 py-0.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-64 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-400">
                No conversations yet
              </div>
            ) : (
              <ul className="py-1">
                {conversations.map((convo) => (
                  <li key={convo.id} role="menuitem">
                    <div
                      className={`w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer ${
                        convo.id === activeConversationId ? 'bg-indigo-50' : ''
                      }`}
                      onClick={() => handleSelect(convo)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSelect(convo); } }}
                      tabIndex={0}
                      role="button"
                      aria-label={`Load conversation: ${getPreview(convo)}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 truncate">
                          {getPreview(convo)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {formatDate(convo.updatedAt)} &middot;{' '}
                          {convo.messages.length} message{convo.messages.length !== 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, convo.id)}
                        className="shrink-0 rounded p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                        aria-label="Delete conversation"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
