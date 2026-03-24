'use client';

interface DiagramRendererProps {
  content: string;
  metadata?: Record<string, any>;
}

export function DiagramRenderer({ content, metadata }: DiagramRendererProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-[var(--card)] border border-[var(--border)]">
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] px-4 pt-3">{metadata.title}</div>
      )}
      <div className="p-4">
        <pre className="m-0 text-xs text-[var(--text-muted)] whitespace-pre-wrap overflow-x-auto" style={{ fontFamily: "'Fira Code', 'Consolas', monospace" }}>
          {content}
        </pre>
      </div>
    </div>
  );
}
