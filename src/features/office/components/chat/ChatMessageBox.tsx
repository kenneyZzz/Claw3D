'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import type { ChatFile, Message } from '../../types/chat';
import { ChatMarkdown } from './ChatMarkdown';
import { StepIndicator } from './StepIndicator';
import { ArtifactList } from './ArtifactList';
import { useI18n } from '@/lib/i18n';

export interface ChatMessageBoxHandle {
  scrollToBottom: () => void;
}

interface ChatMessageBoxProps {
  messages: Message[];
  isChatMode?: boolean;
  agentEmoji?: string;
  className?: string;
  hasMore?: boolean;
  isLoadingHistory?: boolean;
  onLoadMore?: () => void;
  onRegenerate?: (text: string) => void;
  onSubmitEdit?: (payload: { index: number; text: string }) => void;
}

function getFileIcon(file: ChatFile) {
  const fileType = file.fileType?.toLowerCase() || '';
  const fileName = file.fileName?.toLowerCase() || '';
  const filePath = file.filePath?.toLowerCase() || '';
  const text = [fileType, fileName, filePath].join(' ');

  if (['bmp', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'].includes(fileType)) return '🖼️';
  if (text.includes('pdf') || fileType === 'pdf') return '📕';
  if (['csv', 'xls', 'xlsx'].includes(fileType)) return '📊';
  if (['doc', 'docx'].includes(fileType)) return '📝';
  if (['7z', 'gz', 'rar', 'zip'].includes(fileType)) return '📦';
  return '📎';
}

export const ChatMessageBox = forwardRef<ChatMessageBoxHandle, ChatMessageBoxProps>(
  function ChatMessageBox(
    {
      messages,
      isChatMode = true,
      agentEmoji,
      className,
      hasMore,
      isLoadingHistory,
      onLoadMore,
      onRegenerate,
      onSubmitEdit,
    },
    ref
  ) {
    const { t } = useI18n();
    const listRef = useRef<HTMLDivElement>(null);
    const [expandedThoughts, setExpandedThoughts] = useState<Record<number, boolean>>({});
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingText, setEditingText] = useState('');
    const [expandedReasons, setExpandedReasons] = useState<Record<number, boolean>>({});

    const isNearBottomRef = useRef(true);
    const prevIsLoadingHistoryRef = useRef(false);
    const scrollSnapshotRef = useRef({ height: 0, top: 0 });

    useImperativeHandle(ref, () => ({
      scrollToBottom() {
        if (listRef.current) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        }
      },
    }));

    // Capture pre-update scroll state during render for history prepend restoration
    if (listRef.current) {
      scrollSnapshotRef.current = {
        height: listRef.current.scrollHeight,
        top: listRef.current.scrollTop,
      };
    }

    // Restore scroll position after history messages are prepended
    useLayoutEffect(() => {
      const el = listRef.current;
      if (!el) return;

      const wasPrepend = prevIsLoadingHistoryRef.current && !isLoadingHistory;

      if (wasPrepend) {
        const heightDelta = el.scrollHeight - scrollSnapshotRef.current.height;
        if (heightDelta > 0) {
          el.scrollTop = scrollSnapshotRef.current.top + heightDelta;
        }
      }

      prevIsLoadingHistoryRef.current = !!isLoadingHistory;
    }, [messages, isLoadingHistory]);

    const handleScroll = useCallback(() => {
      const el = listRef.current;
      if (!el) return;

      const threshold = 80;
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;

      if (el.scrollTop <= threshold && hasMore && !isLoadingHistory) {
        onLoadMore?.();
      }
    }, [hasMore, isLoadingHistory, onLoadMore]);

    useEffect(() => {
      if (!isNearBottomRef.current) return;
      const el = listRef.current;
      if (!el) return;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }, [messages]);

    const toggleThought = useCallback((index: number) => {
      setExpandedThoughts((prev) => ({ ...prev, [index]: !prev[index] }));
    }, []);

    const handleCopy = useCallback(async (text: string) => {
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        /* ignore */
      }
    }, []);

    const handleEdit = useCallback((index: number, text: string) => {
      setEditingIndex(index);
      setEditingText(text);
    }, []);

    const cancelEdit = useCallback(() => {
      setEditingIndex(-1);
      setEditingText('');
    }, []);

    const submitEdit = useCallback(() => {
      if (!editingText.trim()) return;
      onSubmitEdit?.({ index: editingIndex, text: editingText });
      setEditingIndex(-1);
      setEditingText('');
    }, [editingIndex, editingText, onSubmitEdit]);

    const handleRegenerate = useCallback(
      (index: number) => {
        const prevMsg = messages[index - 1];
        if (prevMsg && prevMsg.sender === 'user') {
          onRegenerate?.(prevMsg.content?.text || prevMsg.text || '');
        }
      },
      [messages, onRegenerate]
    );

    if (!isChatMode) return null;

    return (
      <div ref={listRef} className={`overflow-y-auto ${className || ''}`} onScroll={handleScroll}>
        <div className="flex flex-col gap-4 p-5">
          {/* History loading indicator */}
          {isLoadingHistory && (
            <div className="flex items-center justify-center gap-2 py-3 text-sm text-[var(--text-muted)]">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              {t('chat.loadingHistory')}
            </div>
          )}

          {!isLoadingHistory && hasMore === false && messages.length > 0 && (
            <div className="py-2 text-center text-xs text-[var(--text-muted)]">
              {t('chat.loadedAllHistory')}
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={msg.id || index}
              className={`group flex gap-3 max-w-[85%] ${
                msg.sender === 'user' ? 'flex-row-reverse self-end' : 'self-start'
              }`}
            >
              {/* Avatar */}
              <div
                className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm"
                style={
                  msg.sender === 'user' ? { backgroundColor: 'var(--accent)', color: '#fff' } : {}
                }
              >
                {msg.sender === 'user' ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff" stroke="none">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                ) : (
                  <span className="text-lg">{agentEmoji || '🤖'}</span>
                )}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                {/* Loading indicator */}
                {msg.isLoading && (
                  <div className="flex items-center gap-1 text-[var(--accent)] text-sm py-2">
                    {t('chat.common.thinking')}
                    <span className="inline-flex gap-0.5">
                      <span
                        className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                        style={{ animationDelay: '0s' }}
                      />
                      <span
                        className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                        style={{ animationDelay: '0.2s' }}
                      />
                      <span
                        className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                        style={{ animationDelay: '0.4s' }}
                      />
                    </span>
                  </div>
                )}

                {!msg.isLoading && (
                  <>
                    {/* Thought completion indicator */}
                    {msg.showLoadingIndicator && (
                      <div>
                        <div
                          className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] cursor-pointer py-1"
                          onClick={() => toggleThought(index)}
                        >
                          {t('chat.thoughtComplete')}
                          <svg
                            className="w-3 h-3 transition-transform"
                            style={{
                              transform: expandedThoughts[index]
                                ? 'rotate(180deg)'
                                : 'rotate(0deg)',
                            }}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </div>
                        {expandedThoughts[index] && (
                          <div className="mb-2 ml-2 rounded-lg bg-[var(--bg)] p-2 text-sm text-[var(--text-muted)]">
                            {t('chat.thoughtDetailPlaceholder')}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Streaming indicator (no showLoadingIndicator) */}
                    {!msg.showLoadingIndicator && msg.sender === 'bot' && msg.isStreaming && (
                      <div className="flex items-center gap-1 text-[var(--accent)] text-sm py-1">
                        {t('chat.common.thinking')}
                        <span className="inline-flex gap-0.5">
                          <span
                            className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                            style={{ animationDelay: '0s' }}
                          />
                          <span
                            className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span
                            className="w-1 h-1 rounded-full bg-[var(--accent)] animate-bounce"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </span>
                      </div>
                    )}

                    {/* Steps & Tool calls */}
                    {msg.sender === 'bot' && (msg.steps?.length || msg.toolCalls?.length) ? (
                      <StepIndicator steps={msg.steps || []} toolCalls={msg.toolCalls || []} />
                    ) : null}

                    {/* Artifacts */}
                    {msg.sender === 'bot' && msg.artifacts?.length ? (
                      <ArtifactList artifacts={msg.artifacts} streaming={msg.isStreaming} />
                    ) : null}

                    {/* Interaction request */}
                    {msg.sender === 'bot' && msg.interactionQuestion && (
                      <div className="p-4 my-2 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5">
                        <div className="flex items-center gap-1.5 mb-2.5">
                          <span className="text-[var(--accent)]">❓</span>
                          <span className="text-sm font-medium text-[var(--accent)]">
                            {t('chat.needMoreInfo')}
                          </span>
                        </div>
                        <p className="m-0 text-[15px] font-medium leading-relaxed text-[var(--text)]">
                          {msg.interactionQuestion}
                        </p>
                        {msg.interactionMessage && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs text-[var(--text-muted)] bg-transparent border-none rounded cursor-pointer hover:bg-[var(--bg)] transition-colors"
                              onClick={() =>
                                setExpandedReasons((prev) => ({ ...prev, [index]: !prev[index] }))
                              }
                            >
                              ℹ️ {t('chat.reason')}
                              <span className="text-[10px]">
                                {expandedReasons[index] ? '▲' : '▼'}
                              </span>
                            </button>
                            {expandedReasons[index] && (
                              <p className="mt-1.5 px-3 py-2 text-[13px] leading-snug text-[var(--text-muted)] bg-[var(--bg)] rounded-lg">
                                {msg.interactionMessage}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text content */}
                    {msg.type === 'text' && (
                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          msg.sender === 'user'
                            ? 'bg-[#e9eef6] text-[#333] [html[data-theme=dark]_&]:bg-[var(--accent)]/20 [html[data-theme=dark]_&]:text-[var(--text)]'
                            : ''
                        }`}
                      >
                        {editingIndex === index ? (
                          <div className="relative min-w-0">
                            <textarea
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full resize-none border-none bg-transparent px-0 py-0 text-base outline-none mb-10"
                              rows={3}
                              placeholder={t('chat.editPlaceholder')}
                            />
                            <div className="absolute bottom-0 right-0 flex gap-2">
                              <button
                                className="px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--text-muted)] cursor-pointer hover:bg-[var(--bg)]"
                                onClick={cancelEdit}
                              >
                                {t('chat.cancel')}
                              </button>
                              <button
                                className="px-4 py-1.5 rounded-full border-none bg-[var(--accent)] text-sm text-white cursor-pointer hover:opacity-90"
                                onClick={submitEdit}
                              >
                                {t('office.send')}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {msg.sender === 'bot' ? (
                              <ChatMarkdown streaming={!!msg.isStreaming}>
                                {msg.text || ''}
                              </ChatMarkdown>
                            ) : (
                              <span className="whitespace-pre-wrap text-sm">{msg.text}</span>
                            )}
                            {msg.isStopped && (
                              <div className="mt-2 text-sm text-[var(--accent)]">{t('chat.stopped')}</div>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Render (markdown-like) content */}
                    {msg.type === 'render' && (msg.text || msg.isStopped) && (
                      <div className="py-0 min-w-[40%] max-w-full overflow-x-auto">
                        {msg.text && (
                          <ChatMarkdown streaming={!!msg.isStreaming}>{msg.text}</ChatMarkdown>
                        )}
                        {msg.isStopped && (
                          <div className="mt-2 text-sm text-[var(--accent)]">{t('chat.stopped')}</div>
                        )}
                      </div>
                    )}

                    {/* Attached files */}
                    {msg.content?.files?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {msg.content.files.map((file) => (
                          <a
                            key={file.filePath || file.fileName}
                            href={file.filePath || undefined}
                            download={file.fileName}
                            target={file.filePath ? '_blank' : undefined}
                            rel={file.filePath ? 'noreferrer' : undefined}
                            className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-xs text-[var(--text-muted)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)] no-underline ${
                              !file.filePath ? 'pointer-events-none opacity-70' : ''
                            }`}
                          >
                            <span className="shrink-0">{getFileIcon(file)}</span>
                            <span className="max-w-[220px] truncate" title={file.fileName || ''}>
                              {file.fileName}
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : null}

                    {/* Bot action buttons */}
                    {msg.sender === 'bot' && !msg.isStreaming && !msg.hideActions && (
                      <div className="mt-2 flex items-center gap-3 pl-1 text-[var(--text-muted)]">
                        <button
                          className="cursor-pointer hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                          title={t('chat.copy')}
                          onClick={() => handleCopy(msg.text || '')}
                        >
                          📋
                        </button>
                        <button
                          className="cursor-pointer hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                          title={t('chat.like')}
                        >
                          👍
                        </button>
                        <button
                          className="cursor-pointer hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                          title={t('chat.dislike')}
                        >
                          👎
                        </button>
                        <button
                          className="cursor-pointer hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                          title={t('chat.regenerate')}
                          onClick={() => handleRegenerate(index)}
                        >
                          🔄
                        </button>
                        <button
                          className="cursor-pointer hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                          title={t('chat.more')}
                        >
                          ···
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* User message hover actions */}
              {msg.sender === 'user' && editingIndex !== index && (
                <div className="flex items-center gap-2 self-center opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                    title={t('chat.copy')}
                    onClick={() => handleCopy(msg.text || msg.content?.text || '')}
                  >
                    📋
                  </button>
                  {/* <button
                    className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent)] bg-transparent border-none p-0 transition-colors"
                    title="编辑"
                    onClick={() => handleEdit(index, msg.text || msg.content?.text || '')}
                  >
                    ✏️
                  </button> */}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }
);
