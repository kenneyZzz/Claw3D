'use client';

import { useMemo, useCallback } from 'react';

interface CsvTableProps {
  content: string;
  metadata?: Record<string, any>;
}

export function CsvTable({ content, metadata }: CsvTableProps) {
  const separator = metadata?.separator || ',';

  const tableData = useMemo(() => {
    const lines = content.trim().split('\n');
    if (lines.length === 0) return { headers: [] as string[], rows: [] as string[][] };
    const headers = lines[0]!.split(separator).map((h) => h.trim());
    const rows = lines.slice(1).map((line) =>
      line.split(separator).map((cell) => cell.trim()),
    );
    return { headers, rows };
  }, [content, separator]);

  const copyTable = useCallback(() => {
    const { headers, rows } = tableData;
    if (!headers.length) return;
    const header = '| ' + headers.join(' | ') + ' |';
    const sep = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const body = rows.map((row) => '| ' + row.join(' | ') + ' |').join('\n');
    navigator.clipboard.writeText(`${header}\n${sep}\n${body}`).catch(() => {});
  }, [tableData]);

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--border)]">
      {metadata?.title && (
        <div className="flex items-center justify-between px-2.5 py-2 bg-[var(--bg)]">
          <span className="font-semibold text-[13px] text-[var(--text)]">{metadata.title}</span>
          <button className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] bg-transparent border-none text-sm" onClick={copyTable}>📋</button>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {tableData.headers.map((h, i) => (
                <th key={i} className="px-3 py-2 text-left font-semibold text-[var(--text)] whitespace-nowrap border-b border-[var(--border)]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.rows.map((row, ri) => (
              <tr key={ri} className="hover:bg-[var(--bg)] transition-colors">
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-2 text-left text-[var(--text-muted)] border-b border-[var(--border)]">
                    {cell}
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
