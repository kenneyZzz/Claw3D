'use client';

import { useMemo } from 'react';

interface ToolCardProps {
  content: any;
  metadata?: Record<string, any>;
  artifactType: 'MCP_CALL' | 'TOOL_CALL';
}

export function ToolCard({ content, metadata, artifactType }: ToolCardProps) {
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return data; }
    }
    return data;
  }, [content]);

  const title = useMemo(() => {
    if (artifactType === 'MCP_CALL') {
      return `${parsed?.server || 'MCP'} / ${parsed?.tool || 'unknown'}`;
    }
    return `${parsed?.toolName || 'Tool'} - ${parsed?.action || 'call'}`;
  }, [parsed, artifactType]);

  return (
    <div className="my-2">
      <div className="font-semibold text-sm text-[var(--text)] mb-1">{title}</div>
      <pre className="m-0 whitespace-pre-wrap break-words text-[13px] text-[var(--text-muted)]" style={{ fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace" }}>
        {JSON.stringify(parsed, null, 2)}
      </pre>
    </div>
  );
}
