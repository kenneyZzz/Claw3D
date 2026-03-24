'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';

interface ChartRendererProps {
  content: any;
  metadata?: Record<string, any>;
}

export function ChartRenderer({ content }: ChartRendererProps) {
  const { t } = useI18n();
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return null; }
    }
    return data;
  }, [content]);

  if (!parsed) return null;

  const chartType = parsed.chartType || 'bar';
  const xAxis = parsed.xAxis || [];
  const series = parsed.series || [];

  return (
    <div className="overflow-hidden rounded-lg bg-[var(--card)] border border-[var(--border)] p-4">
      {parsed.title && (
        <div className="text-center font-semibold text-sm text-[var(--text)] mb-3">{parsed.title}</div>
      )}
      <div className="text-xs text-[var(--text-muted)] space-y-2">
        <div className="flex items-center gap-2">
          <span className="font-medium">{t('artifact.chartType')}:</span>
          <span className="px-2 py-0.5 rounded bg-[var(--bg)] text-[var(--accent)]">{chartType}</span>
        </div>
        {xAxis.length > 0 && (
          <div>
            <span className="font-medium">{t('artifact.xAxis')}: </span>
            <span>{xAxis.join(', ')}</span>
          </div>
        )}
        {series.map((s: any, i: number) => (
          <div key={i}>
            <span className="font-medium">{s.name || t('artifact.series', { index: i + 1 })}: </span>
            <span>{Array.isArray(s.data) ? s.data.join(', ') : JSON.stringify(s.data)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
