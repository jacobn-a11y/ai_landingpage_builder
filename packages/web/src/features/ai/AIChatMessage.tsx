/**
 * Renders a single chat message (user or assistant).
 * Supports basic formatting: **bold** and line breaks.
 */

import type { ChatMessage } from './stores/chat-store';

function formatContent(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIdx) => {
    // Split by bold markers **...**
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    const lineNodes = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={`${lineIdx}-${partIdx}`}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });

    if (lineIdx > 0) {
      result.push(<br key={`br-${lineIdx}`} />);
    }
    result.push(...lineNodes);
  });

  return result;
}

interface AIChatMessageProps {
  message: ChatMessage;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
          isUser
            ? 'bg-blue-50 text-blue-900 ml-8'
            : 'bg-gray-50 text-gray-900 mr-8'
        }`}
      >
        {formatContent(message.content)}
      </div>
    </div>
  );
}
