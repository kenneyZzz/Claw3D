'use client';

interface SvgRendererProps {
  content: string;
  metadata?: Record<string, any>;
}

export function SvgRenderer({ content, metadata }: SvgRendererProps) {
  return (
    <div className="overflow-hidden">
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] py-2">{metadata.title}</div>
      )}
      <div className="flex [&_svg]:max-w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: content }} />
    </div>
  );
}
