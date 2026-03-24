'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Message } from '../types/chat';

const STORAGE_PREFIX = 'pixel-office-chat-';
const SAVE_DEBOUNCE_MS = 500;

interface ChatSessionData {
  sessionId: string;
  messages: Message[];
  suggestions: string[];
  updatedAt: number;
}

const DEFAULT_MESSAGES: Message[] = [
  {
    text: '您好～ 我是您的 AI 智能助手，有什么可以帮您的吗？',
    sender: 'bot',
    type: 'text',
    hideActions: true,
  },
];

function getStorageKey(agentKey: string): string {
  return `${STORAGE_PREFIX}${agentKey}`;
}

function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadSession(agentKey: string): ChatSessionData | null {
  try {
    const raw = localStorage.getItem(getStorageKey(agentKey));
    if (!raw) return null;
    return JSON.parse(raw) as ChatSessionData;
  } catch {
    return null;
  }
}

function saveSession(agentKey: string, data: ChatSessionData): void {
  try {
    localStorage.setItem(getStorageKey(agentKey), JSON.stringify(data));
  } catch {
    // localStorage quota / disabled — silently ignore
  }
}

function removeSession(agentKey: string): void {
  try {
    localStorage.removeItem(getStorageKey(agentKey));
  } catch {
    // ignore
  }
}

/**
 * Clean up messages restored from storage:
 * - Incomplete bot responses (isLoading/isStreaming) are marked as interrupted
 * - Empty loading-only bot messages at the end are removed
 */
function sanitizeRestoredMessages(messages: Message[]): Message[] {
  let cleaned = messages.map((msg) => {
    if (msg.sender !== 'bot') return msg;
    if (!msg.isLoading && !msg.isStreaming) return msg;
    return {
      ...msg,
      isLoading: false,
      isStreaming: false,
      isStopped: true,
      showLoadingIndicator: true,
      text: msg.text || '（页面刷新，回复已中断）',
      type: (msg.text ? msg.type : 'text') as Message['type'],
    };
  });

  // Remove trailing empty bot placeholder that had no content
  while (cleaned.length > 1) {
    const last = cleaned[cleaned.length - 1]!;
    if (last.sender === 'bot' && last.isStopped && last.text === '（页面刷新，回复已中断）') {
      cleaned = cleaned.slice(0, -1);
    } else {
      break;
    }
  }

  return cleaned;
}

/**
 * Hook that manages chat session persistence via `localStorage` (same origin).
 *
 * Data survives closing the tab or browser until cleared by the user, site data
 * removal, or `clearSession` — unlike `sessionStorage`, which is scoped to one tab session.
 *
 * - Generates or restores a `sessionId` per agent
 * - Persists `messages` and `suggestions` across reloads
 * - Provides a `clearSession` to reset conversation and remove the stored payload
 *
 * @param agentKey  Unique identifier for the agent (e.g. agentId).
 *                  Each agent gets its own isolated storage slot.
 */
export function useChatSession(agentKey: string) {
  const saved = useMemo(() => loadSession(agentKey), [agentKey]);

  const [sessionId, setSessionId] = useState<string>(() => saved?.sessionId || generateSessionId());

  const [messages, setMessages] = useState<Message[]>(() =>
    saved?.messages?.length ? sanitizeRestoredMessages(saved.messages) : [...DEFAULT_MESSAGES]
  );

  const [suggestions, setSuggestions] = useState<string[]>(() => saved?.suggestions || []);

  const [storedAgentKey, setStoredAgentKey] = useState(agentKey);
  if (storedAgentKey !== agentKey) {
    setStoredAgentKey(agentKey);
    setSessionId(saved?.sessionId || generateSessionId());
    setMessages(
      saved?.messages?.length ? sanitizeRestoredMessages(saved.messages) : [...DEFAULT_MESSAGES]
    );
    setSuggestions(saved?.suggestions || []);
  }

  // Debounced persistence
  useEffect(() => {
    const timer = setTimeout(() => {
      saveSession(agentKey, {
        sessionId,
        messages,
        suggestions,
        updatedAt: Date.now(),
      });
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [agentKey, sessionId, messages, suggestions]);

  const clearSession = useCallback(() => {
    setMessages([...DEFAULT_MESSAGES]);
    setSuggestions([]);
    removeSession(agentKey);
  }, [agentKey]);

  return {
    sessionId,
    messages,
    setMessages,
    suggestions,
    setSuggestions,
    clearSession,
  };
}
