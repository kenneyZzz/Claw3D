'use client';

interface TextBlockProps {
  content: string;
  metadata?: Record<string, any>;
}

export function TextBlock({ content, metadata }: TextBlockProps) {
  return (
    <div>
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] mb-2">{metadata.title}</div>
      )}
      <p className="m-0 whitespace-pre-wrap leading-relaxed text-sm text-[var(--text-muted)]">
        {content}
      </p>
    </div>
  );
}
