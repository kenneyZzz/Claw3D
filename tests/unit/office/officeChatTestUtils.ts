import { createElement, type ReactElement, type ReactNode } from 'react';
import { render } from '@testing-library/react';
import { I18nProvider } from '@/lib/i18n';
import type { AgentState } from '@/features/agents/state/store';
import type { Message } from '@/features/office/types/chat';

type MockCallback<T> = (payload: T) => void;

class MockSchedulerWebSocket {
  public isClosed = false;
  public connectCount = 0;
  public closeCount = 0;
  public sentPayloads: unknown[] = [];

  private messageCallbacks = new Set<MockCallback<unknown>>();
  private openCallbacks = new Set<MockCallback<Event>>();
  private errorCallbacks = new Set<MockCallback<Event>>();

  connect() {
    this.isClosed = false;
    this.connectCount += 1;
  }

  close() {
    this.isClosed = true;
    this.closeCount += 1;
  }

  send(payload: unknown) {
    this.sentPayloads.push(payload);
  }

  onMessage(callback: MockCallback<unknown>) {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onOpen(callback: MockCallback<Event>) {
    this.openCallbacks.add(callback);
    return () => this.openCallbacks.delete(callback);
  }

  onError(callback: MockCallback<Event>) {
    this.errorCallbacks.add(callback);
    return () => this.errorCallbacks.delete(callback);
  }

  emitMessage(payload: unknown) {
    for (const callback of this.messageCallbacks) callback(payload);
  }

  emitOpen() {
    const event = new Event('open');
    for (const callback of this.openCallbacks) callback(event);
  }

  emitError() {
    const event = new Event('error');
    for (const callback of this.errorCallbacks) callback(event);
  }

  forceReset() {
    this.isClosed = true;
    this.messageCallbacks.clear();
    this.openCallbacks.clear();
    this.errorCallbacks.clear();
    this.sentPayloads = [];
  }
}

const socketRegistry = new Map<string, MockSchedulerWebSocket[]>();

function getAgentBucket(agentId: string) {
  if (!socketRegistry.has(agentId)) socketRegistry.set(agentId, []);
  return socketRegistry.get(agentId)!;
}

function latestSocket(agentId: string) {
  const sockets = socketRegistry.get(agentId) ?? [];
  return sockets[sockets.length - 1] ?? null;
}

export function resetOfficeChatTestState() {
  for (const sockets of socketRegistry.values()) {
    for (const socket of sockets) socket.forceReset();
  }
  socketRegistry.clear();
  window.localStorage.clear();
}

export function createMockSchedulerWebSocket(params?: Record<string, string>) {
  const agentId = params?.agentId ?? '__default__';
  const socket = new MockSchedulerWebSocket();
  getAgentBucket(agentId).push(socket);
  return socket;
}

export function connectCallsFor(agentId: string) {
  return (socketRegistry.get(agentId) ?? []).reduce(
    (sum, socket) => sum + socket.connectCount,
    0,
  );
}

export function closeCallsFor(agentId: string) {
  return (socketRegistry.get(agentId) ?? []).reduce(
    (sum, socket) => sum + socket.closeCount,
    0,
  );
}

export function sentPayloadsFor(agentId: string) {
  return (socketRegistry.get(agentId) ?? []).flatMap((socket) => socket.sentPayloads);
}

export function emitStream(agentId: string, delta: string, sessionId = `session-${agentId}`) {
  latestSocket(agentId)?.emitMessage({
    type: 'stream',
    delta,
    sessionId,
    timestamp: Date.now(),
  });
}

export function emitDone(
  agentId: string,
  content: string,
  sessionId = `session-${agentId}`,
) {
  latestSocket(agentId)?.emitMessage({
    type: 'done',
    taskId: `task-${agentId}`,
    content,
    finishReason: 'stop',
    duration: 1,
    sessionId,
    timestamp: Date.now(),
  });
}

export function emitError(
  agentId: string,
  message: string,
  sessionId = `session-${agentId}`,
) {
  latestSocket(agentId)?.emitMessage({
    type: 'error',
    code: 'ERR_TEST',
    message,
    sessionId,
    timestamp: Date.now(),
  });
}

export function seedConversation(agentId: string, ...texts: string[]) {
  const messages: Message[] = texts.map((text) => ({
    sender: 'bot',
    text,
    type: 'text',
  }));
  window.localStorage.setItem(
    `pixel-office-chat-${agentId}`,
    JSON.stringify({
      sessionId: `session-${agentId}`,
      messages,
      suggestions: [],
      updatedAt: Date.now(),
    }),
  );
}

export function createAgent(agentId: string, name: string): AgentState {
  return {
    agentId,
    name,
    sessionKey: `zhinao-${agentId}`,
    status: 'idle',
    sessionCreated: true,
    awaitingUserInput: false,
    hasUnseenActivity: false,
    outputLines: [],
    lastResult: null,
    lastDiff: null,
    runId: null,
    runStartedAt: null,
    streamText: null,
    thinkingTrace: null,
    latestOverride: null,
    latestOverrideKind: null,
    lastAssistantMessageAt: null,
    lastActivityAt: null,
    latestPreview: null,
    lastUserMessage: null,
    draft: '',
    queuedMessages: [],
    sessionSettingsSynced: true,
    historyLoadedAt: null,
    historyFetchLimit: null,
    historyFetchedCount: null,
    historyMaybeTruncated: false,
    toolCallingEnabled: true,
    showThinkingTraces: true,
    avatarSeed: agentId,
    avatarUrl: null,
    model: null,
    thinkingLevel: null,
  };
}

export const agentA = createAgent('agent-a', 'Agent A');
export const agentB = createAgent('agent-b', 'Agent B');

function TestProviders({ children }: { children: ReactNode }) {
  return createElement(I18nProvider, null, children);
}

export function renderWithProviders(ui: ReactElement) {
  return render(ui, { wrapper: TestProviders });
}
