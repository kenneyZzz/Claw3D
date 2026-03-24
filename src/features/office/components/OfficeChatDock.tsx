'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import type { AgentState } from '@/features/agents/state/store';
import type { Message } from '@/features/office/types/chat';
import { useI18n } from '@/lib/i18n';

import { useAttachments } from '@/features/office/hooks/useAttachments';
import { useChatWebSocket } from '@/features/office/hooks/useChatWebSocket';
import { useChatSession } from '@/features/office/hooks/useChatSession';
import {
  ChatMessageBox,
  type ChatMessageBoxHandle,
} from '@/features/office/components/chat/ChatMessageBox';
import { ChatInputBox } from '@/features/office/components/chat/ChatInputBox';

function finalizeStaleLastBot(messages: Message[]): Message[] {
  const updated = [...messages];
  for (let i = updated.length - 1; i >= 0; i--) {
    if (updated[i]!.sender !== 'bot') continue;
    const bot = updated[i]!;
    const hasRunningStep = bot.steps?.some((s) => s.status === 'running');
    if (!bot.isLoading && !bot.isStreaming && !hasRunningStep) break;
    updated[i] = {
      ...bot,
      isLoading: false,
      isStreaming: false,
      showLoadingIndicator: true,
      steps: bot.steps?.map((s) =>
        s.status === 'running' ? { ...s, status: 'completed' as const } : s,
      ),
    };
    break;
  }
  return updated;
}

interface OfficeChatDockProps {
  sidebarOpen: boolean;
  debugEnabled: boolean;
  chatOpen: boolean;
  runningCount: number;
  agents: AgentState[];
  selectedChatAgentId: string | null;
  onToggleChat: () => void;
  onSelectAgent: (agentId: string) => void;
}

export function OfficeChatDock({
  sidebarOpen,
  debugEnabled,
  chatOpen,
  runningCount,
  agents,
  selectedChatAgentId,
  onToggleChat,
  onSelectAgent,
}: OfficeChatDockProps) {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');

  const focusedChatAgent = useMemo(
    () =>
      selectedChatAgentId
        ? (agents.find((a) => a.agentId === selectedChatAgentId) ?? null)
        : null,
    [selectedChatAgentId, agents],
  );

  useEffect(() => {
    if (chatOpen && !selectedChatAgentId && agents.length > 0) {
      onSelectAgent(agents[0]!.agentId);
    }
  }, [chatOpen, selectedChatAgentId, agents, onSelectAgent]);

  const transportAgentId = selectedChatAgentId;

  const agentKey = selectedChatAgentId || '__default__';

  const {
    sessionId,
    messages,
    setMessages,
    suggestions,
    setSuggestions,
    clearSession,
  } = useChatSession(agentKey);

  const chatMessageBoxRef = useRef<ChatMessageBoxHandle>(null);

  const {
    fileList,
    handleRemoveFile,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handlePaste,
    handleFileSelect,
    getCompletedAttachments,
    clearAttachments,
    ensureReadyForSend,
  } = useAttachments();

  const getLastBotMessage = useCallback((): Message | null => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i]!.sender === 'bot') return messages[i]!;
    }
    return null;
  }, [messages]);

  const isGenerating = useMemo(() => {
    const bot = getLastBotMessage();
    return !!(bot && (bot.isLoading || bot.isStreaming));
  }, [getLastBotMessage]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatMessageBoxRef.current?.scrollToBottom();
    });
  }, []);

  const {
    send: wsSend,
    stop: wsStop,
    loadHistory,
    hasMore,
    isLoadingHistory,
  } = useChatWebSocket({
    open: chatOpen && !!transportAgentId,
    sessionId,
    agentId: transportAgentId || undefined,
    setMessages,
    setSuggestions,
    scrollToBottom,
  });

  const handleSend = useCallback(
    (text?: string) => {
      const msgText = text || inputText.trim();
      const files = text ? [] : getCompletedAttachments();

      if (!ensureReadyForSend()) return;
      if (!msgText) return;

      const sendText = msgText;

      if (!text) {
        setInputText('');
        clearAttachments();
      }

      setSuggestions([]);

      setMessages((prev) => {
        let next = finalizeStaleLastBot(prev);
        if (!text) {
          next = [
            ...next,
            {
              channel: 'web',
              messageType: 'chat',
              content: { text: sendText, files },
              sender: 'user',
              text: msgText,
              type: 'text',
            },
          ];
        }
        return [
          ...next,
          {
            text: '',
            sender: 'bot',
            type: 'render',
            isLoading: true,
            showLoadingIndicator: false,
          },
        ];
      });
      scrollToBottom();

      wsSend(sendText, files);
    },
    [
      inputText,
      scrollToBottom,
      getCompletedAttachments,
      clearAttachments,
      ensureReadyForSend,
      wsSend,
      setMessages,
      setSuggestions,
    ],
  );

  const handleStop = useCallback(() => {
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i]!.sender === 'bot') {
          updated[i] = {
            ...updated[i]!,
            isLoading: false,
            isStreaming: false,
            isStopped: true,
          };
          break;
        }
      }
      return updated;
    });
    wsStop();
  }, [wsStop, setMessages]);

  const handleRegenerate = useCallback(
    (text: string) => {
      handleSend(text);
    },
    [handleSend],
  );

  const handleSubmitEdit = useCallback(
    ({ index, text }: { index: number; text: string }) => {
      setMessages((prev) => {
        const updated = prev.slice(0, index + 1);
        const msg = updated[index];
        if (msg) {
          updated[index] = {
            ...msg,
            text,
            content: msg.content ? { ...msg.content, text } : undefined,
          };
        }
        return updated;
      });
      handleSend(text);
    },
    [handleSend, setMessages],
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      handleSend(suggestion);
    },
    [handleSend],
  );

  return (
    <div
      className={`fixed bottom-3 z-30 flex flex-col items-end gap-2 ${sidebarOpen ? 'right-84' : 'right-3'} ${debugEnabled ? 'hidden' : ''}`}
    >
      {chatOpen ? (
        <div className="flex h-[560px] w-[640px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
          {/* Agent sidebar */}
          <div className="flex w-44 shrink-0 flex-col border-r border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {t('office.agents')}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {agents.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="px-3 py-4 text-xs text-[var(--text-muted)]">
                  {t('office.noAgents')}
                </div>
              ) : (
                agents.map((agent) => {
                  const isSelected = agent.agentId === selectedChatAgentId;
                  return (
                    <button
                      key={agent.agentId}
                      type="button"
                      onClick={() => onSelectAgent(agent.agentId)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          agent.status === 'error'
                            ? 'bg-red-400'
                            : agent.status === 'running'
                              ? 'bg-green-400'
                              : 'bg-yellow-400'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px]">
                        {agent.name || agent.agentId}
                      </span>
                      {agent.status === 'running' && (
                        <span className="shrink-0 text-[9px] text-emerald-400/70">
                          {t('office.connected')}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {focusedChatAgent ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
                  <span className="text-sm font-semibold text-[var(--text)]">
                    {focusedChatAgent.name || focusedChatAgent.agentId}
                  </span>
                  <button
                    onClick={clearSession}
                    className="flex items-center justify-center w-7 h-7 rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)] cursor-pointer"
                    title={t('chat.newConversation')}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                    </svg>
                  </button>
                </div>

                {/* Messages */}
                <ChatMessageBox
                  ref={chatMessageBoxRef}
                  messages={messages}
                  isChatMode
                  className="min-h-0 flex-1"
                  hasMore={hasMore}
                  isLoadingHistory={isLoadingHistory}
                  onLoadMore={loadHistory}
                  onRegenerate={handleRegenerate}
                  onSubmitEdit={handleSubmitEdit}
                />

                {/* Suggestions */}
                {suggestions.length > 0 && (
                  <div className="px-4 pb-2">
                    <div className="mb-1.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
                      <span>💡</span>
                      <span>{t('chat.suggestions')}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {suggestions.map((suggestion, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-xs text-[var(--text)] transition-colors hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5 cursor-pointer"
                          onClick={() => handleSuggestionClick(suggestion)}
                        >
                          <span className="shrink-0 text-xs text-[var(--accent)]">
                            ✨
                          </span>
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div
                  className="border-t border-[var(--border)] px-4 py-2"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onPaste={handlePaste}
                >
                  <ChatInputBox
                    value={inputText}
                    onChange={setInputText}
                    placeholder={t('office.chatInputPlaceholder')}
                    isGenerating={isGenerating}
                    fileList={fileList.map((f) => ({
                      uid: f.uid,
                      name: f.name,
                      status: f.status,
                    }))}
                    onRequestSend={() => handleSend()}
                    onRequestStop={handleStop}
                    onRemoveFile={handleRemoveFile}
                    onFileSelect={handleFileSelect}
                  />
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
                {t('office.selectAgentToChat')}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleChat}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]/90 px-3 py-1.5 text-xs font-medium tracking-wider text-[var(--text-muted)] shadow-lg backdrop-blur transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--text)]"
      >
        {chatOpen ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>{t('office.hideChat')}</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{t('office.chat')}</span>
            {runningCount > 0 ? (
              <span className="rounded bg-[var(--accent)]/20 px-1 text-[10px] text-[var(--accent)]">
                {runningCount}
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}
