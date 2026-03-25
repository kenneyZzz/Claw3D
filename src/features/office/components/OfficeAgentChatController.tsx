'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { AgentState } from '@/features/agents/state/store';
import type { Message } from '@/features/office/types/chat';
import { useI18n } from '@/lib/i18n';
import { useAttachments } from '@/features/office/hooks/useAttachments';
import { useChatSession } from '@/features/office/hooks/useChatSession';
import { useChatWebSocket } from '@/features/office/hooks/useChatWebSocket';
import {
  ChatMessageBox,
  type ChatMessageBoxHandle,
} from '@/features/office/components/chat/ChatMessageBox';
import { ChatInputBox } from '@/features/office/components/chat/ChatInputBox';

export interface OfficeAgentChatControllerProps {
  agent: AgentState;
  chatOpen: boolean;
  selected: boolean;
}

function finalizeStaleLastBot(messages: Message[]): Message[] {
  const updated = [...messages];
  for (let i = updated.length - 1; i >= 0; i -= 1) {
    if (updated[i]!.sender !== 'bot') continue;
    const bot = updated[i]!;
    const hasRunningStep = bot.steps?.some((step) => step.status === 'running');
    if (!bot.isLoading && !bot.isStreaming && !hasRunningStep) break;
    updated[i] = {
      ...bot,
      isLoading: false,
      isStreaming: false,
      showLoadingIndicator: true,
      steps: bot.steps?.map((step) =>
        step.status === 'running' ? { ...step, status: 'completed' as const } : step,
      ),
    };
    break;
  }
  return updated;
}

export function OfficeAgentChatController({
  agent,
  chatOpen,
  selected,
}: OfficeAgentChatControllerProps) {
  const { t } = useI18n();
  const [inputText, setInputText] = useState('');
  const { sessionId, messages, setMessages, suggestions, setSuggestions, clearSession } =
    useChatSession(agent.agentId);
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
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]!.sender === 'bot') return messages[i]!;
    }
    return null;
  }, [messages]);

  const isGenerating = useMemo(() => {
    const bot = getLastBotMessage();
    return Boolean(bot && (bot.isLoading || bot.isStreaming));
  }, [getLastBotMessage]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      chatMessageBoxRef.current?.scrollToBottom();
    });
  }, []);

  const { send: wsSend, stop: wsStop, loadHistory, hasMore, isLoadingHistory } =
    useChatWebSocket({
      open: chatOpen,
      sessionId,
      agentId: agent.agentId,
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
      getCompletedAttachments,
      ensureReadyForSend,
      clearAttachments,
      setSuggestions,
      setMessages,
      scrollToBottom,
      wsSend,
    ],
  );

  const handleStop = useCallback(() => {
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i -= 1) {
        if (updated[i]!.sender !== 'bot') continue;
        updated[i] = {
          ...updated[i]!,
          isLoading: false,
          isStreaming: false,
          isStopped: true,
        };
        break;
      }
      return updated;
    });
    wsStop();
  }, [setMessages, wsStop]);

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

  if (!selected) return null;

  return (
    <>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2">
        <span className="text-sm font-semibold text-[var(--text)]">
          {agent.name || agent.agentId}
        </span>
        <button
          type="button"
          onClick={clearSession}
          className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg)] hover:text-[var(--text)]"
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

      {suggestions.length > 0 ? (
        <div className="px-4 pb-2">
          <div className="mb-1.5 flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <span>💡</span>
            <span>{t('chat.suggestions')}</span>
          </div>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((suggestion, index) => (
              <button
                key={`${agent.agentId}-suggestion-${index}`}
                type="button"
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-left text-xs text-[var(--text)] transition-colors hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span className="shrink-0 text-xs text-[var(--accent)]">✨</span>
                <span>{suggestion}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

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
          fileList={fileList.map((file) => ({
            uid: file.uid,
            name: file.name,
            status: file.status,
          }))}
          onRequestSend={() => handleSend()}
          onRequestStop={handleStop}
          onRemoveFile={handleRemoveFile}
          onFileSelect={handleFileSelect}
        />
      </div>
    </>
  );
}
