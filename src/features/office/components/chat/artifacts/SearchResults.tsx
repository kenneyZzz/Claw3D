'use client';

import { useMemo } from 'react';

interface SearchResultsProps {
  content: any;
  metadata?: Record<string, any>;
}

export function SearchResults({ content }: SearchResultsProps) {
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return { query: '', results: [] }; }
    }
    return {
      query: data?.query || '',
      results: (data?.results || []) as Array<{ title: string; url: string; snippet?: string }>,
    };
  }, [content]);

  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-2 py-2.5 font-medium text-[13px] text-[var(--text)]">
        <span className="text-[var(--accent)]">🔍</span>
        <span>{parsed.query}</span>
      </div>
      <div className="px-2">
        {parsed.results.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block px-3 py-2.5 rounded-md no-underline text-inherit transition-colors hover:bg-[var(--bg)] border-b border-[var(--border)] last:border-0"
          >
            <div className="font-medium text-[var(--accent)] text-sm mb-0.5">{item.title}</div>
            <div className="text-xs text-[var(--green)] mb-1 truncate">{item.url}</div>
            {item.snippet && (
              <div className="text-[13px] text-[var(--text-muted)] leading-snug">{item.snippet}</div>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
