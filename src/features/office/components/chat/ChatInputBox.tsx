'use client';

import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useI18n } from '@/lib/i18n';

export interface PendingFile {
  uid: string;
  name: string;
  status: 'done' | 'error' | 'uploading';
}

interface ChatInputBoxProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isGenerating?: boolean;
  fileList?: PendingFile[];
  onRequestSend: () => void;
  onRequestStop?: () => void;
  onRemoveFile?: (uid: string) => void;
  onFileSelect?: (files: FileList) => void;
}

export function ChatInputBox({
  value,
  onChange,
  placeholder,
  fileList = [],
  onRequestSend,
  onRemoveFile,
  onFileSelect,
}: ChatInputBoxProps) {
  const { t } = useI18n();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendLockRef = useRef(false);

  const doSend = useCallback(() => {
    if (!value.trim() || sendLockRef.current) return;
    sendLockRef.current = true;
    onRequestSend();
    setTimeout(() => {
      sendLockRef.current = false;
    }, 50);
  }, [value, onRequestSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        doSend();
      }
    },
    [doSend],
  );

  const handleActionClick = useCallback(() => {
    doSend();
  }, [doSend]);

  const handleTextareaInput = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
      const target = e.target;
      target.style.height = 'auto';
      target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
    },
    [onChange],
  );

  return (
    <div className="relative rounded-xl border border-[var(--border)] bg-[var(--bg)]">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleTextareaInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? t('office.chatInputPlaceholder')}
        rows={1}
        className="w-full resize-none bg-transparent text-sm text-[var(--text)] placeholder-[var(--text-muted)] outline-none! ring-0 border-none px-4 py-3 max-h-32 [outline-offset:0]"
        style={{ minHeight: 44 }}
      />

      {fileList.length > 0 && (
        <div className="mx-3 mb-2 flex flex-wrap items-center gap-2 rounded-lg border border-[var(--border)]/70 bg-[var(--bg)] px-2.5 py-2">
          {fileList.map((file) => (
            <span
              key={file.uid}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--card)] px-2 py-1 text-xs text-[var(--text)]"
            >
              {file.status === 'uploading' ? (
                <svg
                  className="w-3 h-3 animate-spin text-[var(--text-muted)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M12 2v4m0 12v4m-7.07-3.93l2.83-2.83m8.49-8.49l2.83-2.83M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.49 8.49l2.83 2.83" />
                </svg>
              ) : file.status === 'error' ? (
                <span className="text-red-500 text-xs">⚠</span>
              ) : (
                <span className="text-[var(--text-muted)] text-xs">📎</span>
              )}
              <span className="max-w-[180px] truncate">{file.name}</span>
              {file.status === 'uploading' && (
                <span className="text-[11px] text-[var(--text-muted)]">
                  {t('chat.uploading')}
                </span>
              )}
              {file.status === 'error' && (
                <span className="text-[11px] text-red-500">
                  {t('chat.uploadFailed')}
                </span>
              )}
              {onRemoveFile && (
                <button
                  type="button"
                  className="rounded p-0.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-red-500 cursor-pointer"
                  onClick={() => onRemoveFile(file.uid)}
                  title={t('chat.remove')}
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 px-3 pb-2">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          title={t('chat.selectFile')}
          onChange={(e) => {
            if (e.target.files?.length) {
              onFileSelect?.(e.target.files);
            }
            e.target.value = '';
          }}
        />
        <button
          type="button"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--card)] transition-colors cursor-pointer"
          title={t('chat.uploadFile')}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button
          type="button"
          onClick={handleActionClick}
          disabled={!value.trim()}
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
          style={{
            backgroundColor: value.trim() ? 'var(--accent)' : 'transparent',
            color: value.trim() ? '#fff' : 'var(--text-muted)',
          }}
          title={t('office.send')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
