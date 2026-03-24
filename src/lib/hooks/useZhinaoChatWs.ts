"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZHINAO_WS_CHAT_URL, ZHINAO_AUTH_CODE } from "@/lib/zhinao-api";

export interface ChatMessage {
  id?: string;
  sender: "bot" | "user";
  text: string;
  isLoading?: boolean;
  isStreaming?: boolean;
}

interface WsHistoryItem {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type WsIncoming =
  | { type: "history"; messages: WsHistoryItem[]; hasMore?: boolean; oldestId?: string }
  | { type: "stream"; delta: string }
  | { type: "done"; content?: string }
  | { type: "error"; message?: string }
  | { type: "step"; step: Record<string, unknown> };

const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface UseZhinaoChatWsOptions {
  agentId: string | null;
  open: boolean;
}

export function useZhinaoChatWs({ agentId, open }: UseZhinaoChatWsOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shouldReconnectRef = useRef(true);

  const cleanup = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  const updateLastBot = useCallback(
    (updater: (bot: ChatMessage) => Partial<ChatMessage>) => {
      setMessages((prev) => {
        const updated = [...prev];
        for (let i = updated.length - 1; i >= 0; i--) {
          if (updated[i].sender === "bot") {
            updated[i] = { ...updated[i], ...updater(updated[i]) };
            break;
          }
        }
        return updated;
      });
    },
    [],
  );

  const handleMessage = useCallback(
    (data: unknown) => {
      const msg = (
        typeof data === "string" ? (() => { try { return JSON.parse(data); } catch { return null; } })() : data
      ) as WsIncoming | null;
      if (!msg || !msg.type) return;

      switch (msg.type) {
        case "history": {
          const converted: ChatMessage[] = msg.messages.map((m) => ({
            id: m.id,
            sender: m.role === "assistant" ? "bot" : "user",
            text: m.content,
          }));
          setMessages(converted);
          break;
        }
        case "stream": {
          updateLastBot((bot) => ({
            isLoading: false,
            isStreaming: true,
            text: (bot.text || "") + (msg.delta || ""),
          }));
          break;
        }
        case "done": {
          updateLastBot((bot) => ({
            isLoading: false,
            isStreaming: false,
            text: msg.content || bot.text,
          }));
          break;
        }
        case "error": {
          updateLastBot(() => ({
            isLoading: false,
            isStreaming: false,
            text: `Error: ${msg.message || "unknown"}`,
          }));
          break;
        }
        default:
          break;
      }
    },
    [updateLastBot],
  );

  const connect = useCallback(() => {
    if (!agentId) return;
    cleanup();
    shouldReconnectRef.current = true;
    reconnectAttemptsRef.current = 0;

    const params = new URLSearchParams({
      agentId,
      "X-Auth-Code": ZHINAO_AUTH_CODE,
    });
    const url = `${ZHINAO_WS_CHAT_URL}?${params.toString()}`;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setConnected(true);
        reconnectAttemptsRef.current = 0;
        heartbeatRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
          }
        }, HEARTBEAT_INTERVAL_MS);
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch {
          handleMessage(event.data);
        }
      });

      ws.addEventListener("close", () => {
        setConnected(false);
        if (heartbeatRef.current) {
          clearInterval(heartbeatRef.current);
          heartbeatRef.current = null;
        }
        if (
          shouldReconnectRef.current &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          reconnectAttemptsRef.current++;
          const delay = Math.min(
            3000 * Math.pow(2, reconnectAttemptsRef.current - 1),
            30_000,
          );
          reconnectTimerRef.current = setTimeout(() => {
            reconnectTimerRef.current = null;
            connect();
          }, delay);
        }
      });

      ws.addEventListener("error", () => {
        // close event will handle reconnect
      });
    } catch {
      // will retry via scheduleReconnect in close handler
    }
  }, [agentId, cleanup, handleMessage]);

  const prevAgentIdRef = useRef(agentId);
  useEffect(() => {
    if (prevAgentIdRef.current !== agentId) {
      prevAgentIdRef.current = agentId;
      setMessages([]);
    }
    if (open && agentId) {
      connect();
    } else {
      shouldReconnectRef.current = false;
      cleanup();
    }
    return () => {
      shouldReconnectRef.current = false;
      cleanup();
    };
  }, [open, agentId, connect, cleanup]);

  const send = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      const payload = {
        channel: "web",
        messageType: "chat",
        sessionId: `zhinao-session-${agentId}`,
        agentId,
        content: { text, files: [] },
      };
      wsRef.current.send(JSON.stringify(payload));

      setMessages((prev) => [
        ...prev,
        { sender: "user", text },
        { sender: "bot", text: "", isLoading: true },
      ]);
    },
    [agentId],
  );

  const stop = useCallback(() => {
    shouldReconnectRef.current = false;
    cleanup();
    setMessages((prev) => {
      const updated = [...prev];
      for (let i = updated.length - 1; i >= 0; i--) {
        if (updated[i].sender === "bot") {
          updated[i] = { ...updated[i], isLoading: false, isStreaming: false };
          break;
        }
      }
      return updated;
    });
  }, [cleanup]);

  return { messages, setMessages, connected, send, stop };
}
