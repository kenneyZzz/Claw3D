'use client';

interface HtmlPreviewProps {
  content: string;
  metadata?: Record<string, any>;
}

export function HtmlPreview({ content, metadata }: HtmlPreviewProps) {
  return (
    <div className="overflow-hidden">
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] py-2">{metadata.title}</div>
      )}
      <div dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
