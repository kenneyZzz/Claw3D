'use client';

import { useState, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';

interface CodeBlockProps {
  content: string;
  metadata?: Record<string, any>;
}

export function CodeBlock({ content, metadata }: CodeBlockProps) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const language = metadata?.language || 'text';
  const filename = metadata?.filename || '';

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [content]);

  return (
    <div className="overflow-hidden rounded-lg" style={{ background: '#1e1e1e' }}>
      <div className="flex items-center justify-between px-3 py-1.5 text-xs" style={{ color: '#aaa' }}>
        <span>{filename || language}</span>
        <button
          className="flex items-center p-0.5 hover:text-white transition-colors cursor-pointer bg-transparent border-none"
          style={{ color: '#aaa' }}
          onClick={copyCode}
          title={copied ? t('artifact.copied') : t('chat.copy')}
        >
          {copied ? '✓' : '📋'}
        </button>
      </div>
      <pre className="m-0 px-4 py-3 overflow-x-auto text-[13px] leading-relaxed" style={{ color: '#d4d4d4', fontFamily: "'Fira Code', 'Consolas', monospace" }}>
        <code className="whitespace-pre">{content}</code>
      </pre>
    </div>
  );
}
