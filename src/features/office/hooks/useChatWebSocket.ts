'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ChatFile,
  Message,
  WsHistoryMessage,
  WsMessage,
} from '@/features/office/types/chat';
import { type SchedulerWebSocket, createSchedulerWebSocket } from './websocket';

const CHAT_CHANNEL = 'web' as const;
const HISTORY_PAGE_SIZE = 5;

/**
 * Module-level WebSocket pool: one connection per agent (keyed by agentId).
 * Connections persist across component mount/unmount cycles so that
 * switching back to a previously opened agent reuses the existing WS.
 */
const agentWsPool = new Map<string, SchedulerWebSocket>();

interface UseChatWebSocketOptions {
  open: boolean;
  sessionId?: string;
  agentId?: string;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  setSuggestions: React.Dispatch<React.SetStateAction<string[]>>;
  scrollToBottom: () => void;
}

function convertHistoryToMessages(history: WsHistoryMessage): Message[] {
  return history.messages.map((m) => ({
    id: m.id,
    sender: (m.role === 'assistant' ? 'bot' : 'user') as Message['sender'],
    text: m.content,
    type: (m.role === 'assistant' ? 'render' : 'text') as Message['type'],
  }));
}

function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Set<string>();
  return messages.filter((m) => {
    if (!m.id) return true;
    if (seen.has(m.id)) return false;
    seen.add(m.id);
    return true;
  });
}

function extractSuggestions(msg: unknown) {
  if (!msg || typeof msg !== 'object' || !('suggestions' in msg)) return null;
  const { suggestions } = msg as { suggestions?: unknown };
  return Array.isArray(suggestions)
    ? suggestions.filter(
        (suggestion: unknown): suggestion is string => typeof suggestion === 'string',
      )
    : null;
}

export function useChatWebSocket({
  open,
  sessionId = 'init-session-001',
  agentId,
  setMessages,
  setSuggestions,
  scrollToBottom,
}: UseChatWebSocketOptions) {
  const wsRef = useRef<SchedulerWebSocket | null>(null);
  const unsubscribesRef = useRef<Array<() => void>>([]);

  const [hasMore, setHasMore] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const hasMoreRef = useRef(false);
  const oldestIdRef = useRef<string | null>(null);
  const isLoadingHistoryRef = useRef(false);

  const updateLastBot = useCallback(
    (updater: (bot: Message) => Partial<Message>) => {
      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i]!.sender === 'bot') {
            const bot = updated[i]!;
            const patch = updater(bot);
            if (Object.keys(patch).length > 0) {
              updated[i] = { ...bot, ...patch };
            }
            break;
          }
        }
        return updated;
      });
    },
    [setMessages]
  );

  const handleWsMessage = useCallback(
    (data: unknown) => {
      if (data === '[DONE]') {
        updateLastBot((bot) => ({
          isStreaming: false,
          isLoading: false,
          showLoadingIndicator: true,
          steps: bot.steps?.map((s) =>
            s.status === 'running' ? { ...s, status: 'completed' as const } : s
          ),
        }));
        return;
      }

      const msg: WsMessage | null =
        typeof data === 'string'
          ? (() => {
              try {
                return JSON.parse(data);
              } catch {
                return null;
              }
            })()
          : (data as WsMessage | null);

      if (!msg || !msg.type) return;

      switch (msg.type) {
        case 'history': {
          const converted = convertHistoryToMessages(msg);

          if (isLoadingHistoryRef.current) {
            setMessages((prev) => deduplicateMessages([...converted, ...prev]));
          } else {
            if (converted.length > 0) {
              setMessages(converted);
            }
            scrollToBottom();
          }

          hasMoreRef.current = msg.hasMore ?? false;
          oldestIdRef.current = msg.oldestId ?? null;
          isLoadingHistoryRef.current = false;
          setHasMore(msg.hasMore ?? false);
          setIsLoadingHistory(false);
          break;
        }

        case 'done': {
          updateLastBot((bot) => {
            const patch: Partial<Message> = {
              isLoading: false,
              isStreaming: false,
              showLoadingIndicator: true,
              steps: bot.steps?.map((s) =>
                s.status === 'running' ? { ...s, status: 'completed' as const } : s
              ),
            };
            if (msg.content) patch.text = msg.content;
            return patch;
          });
          const suggestions = extractSuggestions(msg);
          if (suggestions) {
            setSuggestions(suggestions);
          }
          scrollToBottom();
          break;
        }

        case 'error': {
          updateLastBot(() => ({
            isLoading: false,
            isStreaming: false,
            text: `错误: ${msg.message || '未知错误'}`,
            type: 'text' as const,
          }));
          scrollToBottom();
          break;
        }

        case 'step': {
          updateLastBot((bot) => {
            const steps = [...(bot.steps || [])];
            const idx = steps.findIndex((s) => s.stepId === msg.step.stepId);
            if (idx >= 0) {
              steps[idx] = { ...steps[idx]!, ...msg.step };
            } else {
              steps.push({ ...msg.step });
            }
            const patch: Partial<Message> = { isLoading: false, steps };
            if (msg.step.status === 'running') {
              patch.isStreaming = true;
              patch.showLoadingIndicator = false;
            }
            return patch;
          });
          scrollToBottom();
          break;
        }

        case 'stream': {
          updateLastBot((bot) => ({
            isLoading: false,
            isStreaming: true,
            showLoadingIndicator: false,
            type: 'render' as const,
            text: (bot.text || '') + (msg.delta || ''),
          }));
          scrollToBottom();
          break;
        }

        case 'tool_call': {
          updateLastBot((bot) => ({
            isLoading: false,
            toolCalls: [...(bot.toolCalls || []), { ...msg.toolCall }],
          }));
          scrollToBottom();
          break;
        }

        case 'tool_result': {
          updateLastBot((bot) => {
            const patch: Partial<Message> = {
              isLoading: false,
              isStreaming: true,
              showLoadingIndicator: false,
            };

            const { toolResult } = msg;
            if (toolResult.artifacts?.length) {
              patch.artifacts = [
                ...(bot.artifacts || []),
                ...toolResult.artifacts.map((a) => ({ ...a })),
              ];
            }

            if (bot.toolCalls) {
              patch.toolCalls = bot.toolCalls.map((tc) =>
                tc.toolId === toolResult.toolId
                  ? { ...tc, status: toolResult.success ? 'success' : 'failed' }
                  : tc
              );
            }

            return patch;
          });
          scrollToBottom();
          break;
        }

        case 'interaction_required': {
          updateLastBot(() => ({
            isLoading: false,
            isStreaming: false,
            interactionQuestion: msg.question,
            interactionMessage: msg.message,
            interactionSessionId: msg.sessionId,
          }));
          scrollToBottom();
          break;
        }
      }

      if ((msg as { type?: string }).type === 'suggestions') {
        setSuggestions(extractSuggestions(msg) ?? []);
        scrollToBottom();
      }
    },
    [updateLastBot, setMessages, setSuggestions, scrollToBottom]
  );

  // Use refs so the stable wrapper always delegates to the latest handler.
  // Sync inside useEffect to satisfy React's render-purity rules.
  const handleWsMessageRef = useRef(handleWsMessage);
  const updateLastBotRef = useRef(updateLastBot);
  useEffect(() => {
    handleWsMessageRef.current = handleWsMessage;
    updateLastBotRef.current = updateLastBot;
  });

  const resetPagingState = useCallback(() => {
    hasMoreRef.current = false;
    oldestIdRef.current = null;
    isLoadingHistoryRef.current = false;
    setTimeout(() => {
      setHasMore(false);
      setIsLoadingHistory(false);
    }, 0);
  }, []);

  const loadHistory = useCallback(() => {
    if (
      !hasMoreRef.current ||
      isLoadingHistoryRef.current ||
      !oldestIdRef.current ||
      !wsRef.current
    ) {
      return;
    }

    isLoadingHistoryRef.current = true;
    setIsLoadingHistory(true);

    wsRef.current.send({
      type: 'load_history',
      beforeId: oldestIdRef.current,
      pageSize: HISTORY_PAGE_SIZE,
    });
  }, []);

  const cleanupSubscriptions = useCallback(() => {
    for (const unsub of unsubscribesRef.current) unsub();
    unsubscribesRef.current = [];
  }, []);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const poolKey = agentId || '__default__';
    let ws = agentWsPool.get(poolKey);
    let isReused = false;

    if (ws && !ws.isClosed) {
      wsRef.current = ws;
      isReused = true;
    } else {
      const queryParams: Record<string, string> = {};
      if (agentId) queryParams.agentId = agentId;
      ws = createSchedulerWebSocket(queryParams);
      agentWsPool.set(poolKey, ws);
      wsRef.current = ws;
      ws.connect();
    }

    if (isReused) {
      resetPagingState();
    }

    const unsubOpen = ws.onOpen(() => {
      resetPagingState();
    });

    const unsubMsg = ws.onMessage((data: unknown) => {
      handleWsMessageRef.current(data);
    });

    const unsubErr = ws.onError(() => {
      updateLastBotRef.current((bot) =>
        bot.isLoading ? { text: '连接发生错误，请稍后重试。', isLoading: false } : {}
      );
    });

    unsubscribesRef.current = [unsubOpen, unsubMsg, unsubErr];
  }, [agentId, resetPagingState]);

  const disconnect = useCallback(() => {
    const poolKey = agentId || '__default__';
    cleanupSubscriptions();
    if (wsRef.current) {
      wsRef.current.close();
      agentWsPool.delete(poolKey);
    }
    wsRef.current = null;
    resetPagingState();
  }, [agentId, cleanupSubscriptions, resetPagingState]);

  const send = useCallback(
    (text: string, files: ChatFile[] = []) => {
      if (wsRef.current) {
        const payload: Record<string, unknown> = {
          channel: CHAT_CHANNEL,
          messageType: 'chat',
          sessionId,
          content: { text, files },
        };
        if (agentId) payload.agentId = agentId;
        wsRef.current.send(payload);
      } else {
        updateLastBotRef.current(() => ({
          text: '连接未建立，请关闭后重试。',
          isLoading: false,
        }));
      }
    },
    [sessionId, agentId]
  );

  const stop = useCallback(() => {
    if (wsRef.current) {
      const poolKey = agentId || '__default__';
      cleanupSubscriptions();
      wsRef.current.close();
      agentWsPool.delete(poolKey);
      wsRef.current = null;
      setTimeout(() => connect(), 200);
    }
  }, [agentId, connect, cleanupSubscriptions]);

  const isConnected = useCallback(() => wsRef.current !== null, []);

  // Close the previous connection completely when agentId changes.
  const prevAgentIdRef = useRef(agentId);
  useEffect(() => {
    if (prevAgentIdRef.current === agentId) return;
    disconnect();
    prevAgentIdRef.current = agentId;
    hasMoreRef.current = false;
    oldestIdRef.current = null;
    isLoadingHistoryRef.current = false;
  }, [agentId, disconnect]);

  useEffect(() => {
    if (open) {
      connect();
    } else {
      disconnect();
    }
  }, [open, connect, disconnect]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { send, stop, isConnected, loadHistory, hasMore, isLoadingHistory };
}
