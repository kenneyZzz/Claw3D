'use client';

import { useState } from 'react';
import type { StepInfo, ToolCallInfo } from '../../types/chat';
import { useI18n } from '@/lib/i18n';

interface StepIndicatorProps {
  steps: StepInfo[];
  toolCalls: ToolCallInfo[];
}

export function StepIndicator({ steps, toolCalls }: StepIndicatorProps) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (!steps.length && !toolCalls.length) return null;

  const isRunning = steps.some((s) => s.status === 'running');

  return (
    <div className="my-1 rounded-lg border border-[var(--border)] overflow-hidden">
      <div
        className="flex items-center justify-between px-3 py-2 bg-[var(--bg)] cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {isRunning ? (
            <svg className="w-4 h-4 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
            </svg>
          ) : (
            <svg className="w-4 h-4 text-[var(--green)]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
            </svg>
          )}
          <span className="text-[13px] text-[var(--text-muted)]">
            {isRunning ? t('step.running') : t('step.completed')}
            {toolCalls.length > 0 && (
              <span className="text-xs text-[var(--text-muted)] ml-1">
                {t('step.toolCalls', { count: toolCalls.length })}
              </span>
            )}
          </span>
        </div>
        <svg
          className="w-3.5 h-3.5 text-[var(--text-muted)] transition-transform"
          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {expanded && (
        <div className="px-3 py-2 border-t border-[var(--border)] text-xs space-y-1">
          {steps.map((step) => (
            <div key={step.stepId} className="flex items-center gap-1.5 py-1 text-[var(--text-muted)]">
              {step.status === 'running' ? (
                <svg className="w-3.5 h-3.5 animate-spin text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10" strokeDasharray="60" strokeDashoffset="20" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-[var(--green)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
              )}
              <span>{step.stepName}</span>
              {step.description && (
                <span className="text-[var(--text-muted)]">- {step.description}</span>
              )}
            </div>
          ))}
          {toolCalls.map((tc) => (
            <div key={tc.toolId} className="flex items-center gap-1.5 py-1 text-[var(--text-muted)]">
              <svg className="w-3.5 h-3.5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              <span>{tc.toolName}</span>
              <span
                className="ml-auto text-[11px] px-1.5 py-0.5 rounded"
                style={{
                  background:
                    tc.status === 'success' || tc.status === 'completed'
                      ? 'rgba(74,222,128,0.15)'
                      : tc.status === 'running'
                        ? 'rgba(56,189,248,0.15)'
                        : 'rgba(148,163,184,0.15)',
                  color:
                    tc.status === 'success' || tc.status === 'completed'
                      ? 'var(--green)'
                      : tc.status === 'running'
                        ? 'var(--accent)'
                        : 'var(--text-muted)',
                }}
              >
                {tc.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
