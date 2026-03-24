'use client';

import { useMemo, useCallback } from 'react';

interface DataTableProps {
  content: any;
  metadata?: Record<string, any>;
}

export function DataTable({ content, metadata }: DataTableProps) {
  const parsed = useMemo(() => {
    let data = content;
    if (typeof data === 'string') {
      try { data = JSON.parse(data); } catch { return { columns: [], rows: [] }; }
    }
    return {
      columns: (data?.columns || []) as Array<{ key: string; title: string }>,
      rows: (data?.rows || []) as Array<Record<string, any>>,
    };
  }, [content]);

  const copyTable = useCallback(() => {
    const { columns, rows } = parsed;
    if (!columns.length || !rows.length) return;
    const header = '| ' + columns.map((c) => c.title).join(' | ') + ' |';
    const separator = '| ' + columns.map(() => '---').join(' | ') + ' |';
    const body = rows.map((row) =>
      '| ' + columns.map((col) => row[col.key] ?? '').join(' | ') + ' |'
    ).join('\n');
    navigator.clipboard.writeText(`${header}\n${separator}\n${body}`).catch(() => {});
  }, [parsed]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      {metadata?.title && (
        <div className="flex items-center justify-between px-2.5 py-2 bg-[var(--bg)]" style={{ borderRadius: '12px 12px 0 0' }}>
          <span className="font-semibold text-[13px] text-[var(--text)]">{metadata.title}</span>
          <button className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] bg-transparent border-none text-sm" onClick={copyTable}>📋</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {parsed.columns.map((col) => (
                <th key={col.key} className="px-3 py-2 text-left font-semibold text-[var(--text)] whitespace-nowrap border-b border-[var(--border)]">
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsed.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-[var(--bg)] transition-colors">
                {parsed.columns.map((col) => (
                  <td key={col.key} className="px-3 py-2 text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                    {row[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
