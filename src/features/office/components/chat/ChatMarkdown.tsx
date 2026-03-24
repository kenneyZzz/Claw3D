'use client';

import { NodeRenderer } from 'markstream-react';
import 'markstream-react/index.css';

export interface ChatMarkdownProps {
  children: string;
  /** When true, keep renderer in stream mode */
  streaming?: boolean;
  className?: string;
}

const defaultClassName = 'max-w-none text-sm leading-relaxed text-[var(--text)]';

export function ChatMarkdown({
  children,
  streaming = false,
  className = defaultClassName,
}: ChatMarkdownProps) {
  return (
    <div className={className}>
      <NodeRenderer content={children} final={!streaming} codeBlockStream={streaming} />
    </div>
  );
}
