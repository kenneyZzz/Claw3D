'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';

interface BrowserSnapshotProps {
  content: any;
  metadata?: Record<string, any>;
}

export function BrowserSnapshot({ content }: BrowserSnapshotProps) {
  const { t } = useI18n();
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    return data;
  }, [content]);

  if (!parsed) return null;

  return (
    <div className="overflow-hidden">
      <div className="flex items-center gap-2.5 py-2.5">
        <span className="text-[var(--accent)] text-xl">🖥</span>
        <div>
          <div className="font-medium text-sm text-[var(--text)]">{parsed.title || 'Browser Snapshot'}</div>
          <a href={parsed.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--accent)] no-underline hover:underline">
            {parsed.url}
          </a>
        </div>
      </div>
      {parsed.screenshot && (
        <div className="px-2">
          <img src={parsed.screenshot} alt={parsed.title} className="w-full rounded-xl" />
        </div>
      )}
      {parsed.clickElements?.length > 0 && (
        <div className="px-3.5 py-3 border-t border-[var(--border)]">
          <div className="text-xs font-semibold text-[var(--text-muted)] mb-1.5">{t('artifact.interactiveElements')}</div>
          <div className="flex flex-wrap gap-1.5">
            {parsed.clickElements.map((el: any, i: number) => (
              <div key={i} className="flex items-center gap-1 px-2 py-0.5 bg-[var(--bg)] rounded text-xs">
                <span className="text-[var(--text-muted)] text-[11px]">{el.type}</span>
                <span className="text-[var(--text)]">{el.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
