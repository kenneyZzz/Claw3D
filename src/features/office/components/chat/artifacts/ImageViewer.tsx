'use client';

import { useMemo } from 'react';

interface ImageViewerProps {
  content: string;
  metadata?: Record<string, any>;
}

export function ImageViewer({ content, metadata }: ImageViewerProps) {
  const imgSrc = useMemo(() => {
    if (content.startsWith('data:') || content.startsWith('http')) {
      return content;
    }
    const mime = metadata?.mimeType || 'image/png';
    return `data:${mime};base64,${content}`;
  }, [content, metadata]);

  return (
    <div className="overflow-hidden">
      {metadata?.title && (
        <div className="font-semibold text-[13px] text-[var(--text)] py-2">{metadata.title}</div>
      )}
      <div className="flex">
        <img
          src={imgSrc}
          alt={metadata?.title || 'image'}
          className="max-w-full h-auto rounded-xl"
          style={{
            maxWidth: metadata?.width ? `${metadata.width}px` : undefined,
            maxHeight: metadata?.height ? `${metadata.height}px` : undefined,
          }}
        />
      </div>
    </div>
  );
}
