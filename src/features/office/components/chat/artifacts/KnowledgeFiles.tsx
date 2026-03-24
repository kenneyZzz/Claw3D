'use client';

import type { KnowledgeFile } from '../../../types/chat';
import { useI18n } from '@/lib/i18n';

interface KnowledgeFilesProps {
  files: KnowledgeFile[];
  metadata?: Record<string, any>;
}

const FILE_TYPE_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  word: { label: 'DOC', bg: 'rgba(59,130,246,0.12)', text: '#2563eb' },
  doc: { label: 'DOC', bg: 'rgba(59,130,246,0.12)', text: '#2563eb' },
  docx: { label: 'DOC', bg: 'rgba(59,130,246,0.12)', text: '#2563eb' },
  excel: { label: 'XLS', bg: 'rgba(34,197,94,0.12)', text: '#16a34a' },
  xls: { label: 'XLS', bg: 'rgba(34,197,94,0.12)', text: '#16a34a' },
  xlsx: { label: 'XLS', bg: 'rgba(34,197,94,0.12)', text: '#16a34a' },
  pdf: { label: 'PDF', bg: 'rgba(239,68,68,0.12)', text: '#dc2626' },
  txt: { label: 'TXT', bg: 'rgba(148,163,184,0.15)', text: '#64748b' },
  md: { label: 'MD', bg: 'rgba(168,85,247,0.12)', text: '#9333ea' },
  markdown: { label: 'MD', bg: 'rgba(168,85,247,0.12)', text: '#9333ea' },
  jpg: { label: 'IMG', bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
  jpeg: { label: 'IMG', bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
  png: { label: 'IMG', bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
  image: { label: 'IMG', bg: 'rgba(245,158,11,0.12)', text: '#d97706' },
};

const DEFAULT_CONFIG = { label: 'FILE', bg: 'rgba(148,163,184,0.15)', text: '#64748b' };

function getConfig(fileType: string, fileName: string) {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  const type = fileType?.toLowerCase() || ext;
  return FILE_TYPE_CONFIG[type] || FILE_TYPE_CONFIG[ext] || DEFAULT_CONFIG;
}

function handleDownload(e: React.MouseEvent, file: KnowledgeFile) {
  e.stopPropagation();
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.fileName;
  link.target = '_blank';
  document.body.append(link);
  link.click();
  link.remove();
}

export function KnowledgeFiles({ files, metadata }: KnowledgeFilesProps) {
  const { t } = useI18n();
  return (
    <div className="min-w-0 overflow-hidden">
      {metadata?.title && (
        <div className="text-sm text-[var(--text)] mb-1">
          {metadata.title}
          {metadata.fileCount && (
            <span className="ml-1 text-xs text-[var(--text-muted)]">
              {t('artifact.totalFiles', { count: metadata.fileCount })}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col gap-3 min-w-0">
        {files.map((file, index) => {
          const cfg = getConfig(file.fileType, file.fileName);
          return (
            <div key={index} className="min-w-0">
              <div className="mb-1.5 flex items-center gap-1 text-sm min-w-0 overflow-hidden">
                <span className="shrink-0 text-[var(--text-muted)]">{t('artifact.docSource')}:</span>
                <span className="shrink-0 font-medium text-[var(--accent)] cursor-pointer hover:underline">{file.fileName}</span>
                {file.url && (
                  <>
                    <span className="shrink-0 text-[var(--text-muted)]">🔗</span>
                    <span className="min-w-0 truncate text-[var(--text-muted)]" title={file.url}>{file.url}</span>
                  </>
                )}
              </div>
              <div className="group flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-3 cursor-pointer transition-all hover:border-[var(--accent)]/60 hover:shadow-md min-w-0">
                <div
                  className="flex items-center justify-center w-10 h-10 shrink-0 rounded-lg text-xs font-bold"
                  style={{ background: cfg.bg, color: cfg.text }}
                >
                  {cfg.label}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-[var(--text)]">{file.fileName}</div>
                  {file.description && (
                    <div className="mt-0.5 truncate text-xs text-[var(--text-muted)]">{file.description}</div>
                  )}
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1 shrink-0 rounded-md px-2 py-1 text-xs text-[var(--accent)] transition-colors hover:bg-[var(--accent)]/10 cursor-pointer bg-transparent border-none"
                  onClick={(e) => handleDownload(e, file)}
                  title={t('artifact.download')}
                >
                  ⬇ {t('artifact.download')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
