'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n';

interface CustomRendererProps {
  content: any;
  metadata?: Record<string, any>;
}

export function CustomRenderer({ content, metadata }: CustomRendererProps) {
  const { t } = useI18n();
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return data; }
    }
    return data;
  }, [content]);

  const customType = metadata?.customType || 'unknown';
  const isApprovalFlow = customType === 'approval_flow';

  return (
    <div className="overflow-hidden">
      <div className="font-semibold text-[13px] text-[var(--text)] py-2">
        {metadata?.title || customType}
      </div>

      {isApprovalFlow && parsed?.steps ? (
        <div className="px-4">
          {parsed.steps.map((step: any, i: number) => (
            <div key={i} className="flex gap-3">
              <div className="flex flex-col items-center w-5">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{
                    background: step.status === 'completed' ? 'var(--green)' : 'var(--orange)',
                  }}
                />
                {i < parsed.steps.length - 1 && (
                  <div className="w-0.5 flex-1 min-h-6 bg-[var(--border)]" />
                )}
              </div>
              <div className="pb-4">
                <div className="font-medium text-sm text-[var(--text)]">{step.name}</div>
                <div className="flex gap-2 mt-1 text-xs text-[var(--text-muted)]">
                  {step.operator && <span>{step.operator}</span>}
                  <span
                    className="px-1.5 py-0.5 rounded text-[11px]"
                    style={{
                      background: step.status === 'completed' ? 'rgba(74,222,128,0.15)' : 'rgba(251,146,60,0.15)',
                      color: step.status === 'completed' ? 'var(--green)' : 'var(--orange)',
                    }}
                  >
                    {step.status === 'completed' ? t('artifact.completed') : t('artifact.pending')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <pre className="m-0 px-3 text-xs overflow-x-auto text-[var(--text-muted)] whitespace-pre-wrap">
          {JSON.stringify(parsed, null, 2)}
        </pre>
      )}
    </div>
  );
}
