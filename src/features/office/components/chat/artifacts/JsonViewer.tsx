'use client';

import { useState, useMemo, useCallback } from 'react';

interface JsonViewerProps {
  content: any;
  metadata?: Record<string, any>;
}

export function JsonViewer({ content, metadata }: JsonViewerProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const jsonString = useMemo(() => {
    try {
      const data = typeof content === 'string' ? JSON.parse(content) : content;
      return JSON.stringify(data, null, 2);
    } catch {
      return typeof content === 'string' ? content : JSON.stringify(content);
    }
  }, [content]);

  const copyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [jsonString]);

  return (
    <div className="overflow-hidden rounded-lg" style={{ background: '#1e1e1e' }}>
      <div className="flex items-center justify-between px-3 py-1.5 text-[13px]" style={{ color: '#aaa' }}>
        <span className="cursor-pointer flex items-center gap-1">{metadata?.title || 'JSON'}</span>
        <div className="flex items-center gap-2.5">
          <button
            className="bg-transparent border-none cursor-pointer p-0"
            style={{ color: '#aaa' }}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▶'}
          </button>
          <button
            className="flex items-center bg-transparent border-none cursor-pointer p-0"
            style={{ color: '#aaa' }}
            onClick={copyJson}
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>
      {expanded && (
        <pre className="m-0 px-4 py-3 overflow-x-auto text-[13px] leading-relaxed" style={{ color: '#d4d4d4', fontFamily: "'Fira Code', 'Consolas', monospace" }}>
          {jsonString}
        </pre>
      )}
    </div>
  );
}
