/**
 * Sliding AI Chat panel (right side, 400px wide).
 * Self-contained — no editor context dependency for now.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Trash2, Send } from 'lucide-react';
import { useAIChat } from './hooks/useAIChat';
import { AIChatMessage } from './AIChatMessage';
import { AIMutationCard } from './AIMutationCard';
import type { EditorMutation } from './stores/chat-store';

interface AIChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pageId: string;
  selectedBlockId?: string | null;
  selectedBlockType?: string | null;
  onApplyMutations?: (mutations: EditorMutation[]) => void;
}

const EXAMPLE_PROMPTS = [
  'Change the headline to be more persuasive',
  'Make the hero section background darker',
  'Add a call-to-action button below the text',
  'Remove the last section',
];

function TypingIndicator() {
  return (
    <div className="flex justify-start" role="status" aria-label="AI is thinking">
      <div className="bg-gray-50 rounded-lg p-3 mr-8">
        <span className="sr-only">AI is thinking...</span>
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

export function AIChatPanel({
  isOpen,
  onClose,
  pageId,
  selectedBlockId,
  selectedBlockType,
  onApplyMutations,
}: AIChatPanelProps) {
  const {
    messages,
    isStreaming,
    pendingMutations,
    sendMessage,
    approveChanges,
    rejectChanges,
    clearHistory,
  } = useAIChat({ pageId, selectedBlockId });

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming, pendingMutations]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  const handleSend = useCallback(() => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput('');
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const handleApply = useCallback(
    (mutations: EditorMutation[]) => {
      approveChanges(mutations);
      onApplyMutations?.(mutations);
    },
    [approveChanges, onApplyMutations]
  );

  const handleDiscard = useCallback(
    (_mutations: EditorMutation[]) => {
      rejectChanges();
    },
    [rejectChanges]
  );

  const handleExampleClick = useCallback(
    (prompt: string) => {
      setInput(prompt);
      textareaRef.current?.focus();
    },
    []
  );

  // Auto-resize textarea
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    },
    []
  );

  const contextLabel = selectedBlockType
    ? `Editing: ${selectedBlockType} block`
    : 'Editing: Whole Page';

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        role="dialog"
        aria-label="AI Assistant"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        className={`fixed right-0 top-0 h-full w-full sm:w-[400px] max-w-full bg-white border-l shadow-xl z-50 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">&#10024;</span>
          <h2 className="text-sm font-semibold text-gray-900">AI Assistant</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={clearHistory}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Clear chat history"
            aria-label="Clear chat history"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Close AI panel"
            aria-label="Close AI panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Context indicator */}
      <div className="px-4 py-2 border-b bg-gray-50 shrink-0">
        <span className="text-xs text-gray-500">{contextLabel}</span>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && !isStreaming ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-3xl mb-3">&#10024;</div>
            <p className="text-sm font-medium text-gray-700 mb-1">
              Ask me to edit your page
            </p>
            <p className="text-xs text-gray-400 mb-4">
              I can change text, colors, layout, add or remove blocks.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleExampleClick(prompt)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div key={msg.id}>
                <AIChatMessage message={msg} />
                {msg.mutations && msg.mutations.length > 0 && pendingMutations && (
                  <AIMutationCard
                    mutations={msg.mutations}
                    onApply={handleApply}
                    onDiscard={handleDiscard}
                  />
                )}
              </div>
            ))}
            {isStreaming && messages[messages.length - 1]?.content === '' && (
              <TypingIndicator />
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="px-4 py-3 border-t bg-white shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Describe what you'd like to change..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 border rounded-lg p-3 resize-none text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="p-2.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
            title="Send message"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-1.5 text-center">
          Shift+Enter for new line &middot; Escape to close
        </p>
      </div>
    </div>
    </>
  );
}
