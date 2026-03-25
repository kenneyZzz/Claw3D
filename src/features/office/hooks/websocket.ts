import { ZHINAO_API_BASE, getZhinaoAuthCode, getZhinaoUserId } from '@/lib/zhinao-api';

const STABLE_THRESHOLD_MS = 10_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class SchedulerWebSocket {
  private heartbeatInterval = 30_000;
  private heartbeatTimer: null | ReturnType<typeof setInterval> = null;
  private maxReconnectAttempts = 5;
  private onCloseCallbacks: Set<(event: CloseEvent) => void> = new Set();
  private onErrorCallbacks: Set<(event: Event) => void> = new Set();
  private onMessageCallbacks: Set<(data: any) => void> = new Set();
  private onOpenCallbacks: Set<(event: Event) => void> = new Set();
  private reconnectAttempts = 0;
  private reconnectInterval = 3000;
  private shouldReconnect = true;
  private url: string;
  private params: Record<string, string>;
  private ws: null | WebSocket = null;

  private connectionId = 0;
  private stableTimer: null | ReturnType<typeof setTimeout> = null;
  private reconnectTimer: null | ReturnType<typeof setTimeout> = null;

  constructor(url: string, params: Record<string, string> = {}) {
    this.url = url;
    this.params = params;
  }

  public get isClosed(): boolean {
    return this.ws === null && !this.shouldReconnect;
  }

  public close() {
    this.shouldReconnect = false;
    this.connectionId++;
    this.stopHeartbeat();
    this.clearTimers();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public connect() {
    this.clearTimers();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.shouldReconnect = true;
    this.connectionId++;

    const allParams: Record<string, string> = { ...this.params, 'X-Auth-Code': getZhinaoAuthCode() };
    const userId = getZhinaoUserId();
    if (userId) allParams['X-User-Id'] = userId;
    const qs = new URLSearchParams(allParams).toString();
    const connectionUrl = qs ? `${this.url}?${qs}` : this.url;

    try {
      this.ws = new WebSocket(connectionUrl);
      this.initEventListeners();
    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.scheduleReconnect();
    }
  }

  public onClose(callback: (event: CloseEvent) => void) {
    this.onCloseCallbacks.add(callback);
    return () => this.onCloseCallbacks.delete(callback);
  }

  public onError(callback: (event: Event) => void) {
    this.onErrorCallbacks.add(callback);
    return () => this.onErrorCallbacks.delete(callback);
  }

  public onMessage(callback: (data: any) => void) {
    this.onMessageCallbacks.add(callback);
    return () => this.onMessageCallbacks.delete(callback);
  }

  public onOpen(callback: (event: Event) => void) {
    this.onOpenCallbacks.add(callback);
    return () => this.onOpenCallbacks.delete(callback);
  }

  public send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      this.ws.send(message);
    } else {
      console.warn('WebSocket is not open. Cannot send message.');
    }
  }

  private clearTimers() {
    if (this.stableTimer) {
      clearTimeout(this.stableTimer);
      this.stableTimer = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return;

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached, giving up.');
      this.shouldReconnect = false;
      this.ws = null;
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      MAX_RECONNECT_DELAY_MS
    );
    console.log(
      `Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`
    );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  private initEventListeners() {
    if (!this.ws) return;
    const connId = this.connectionId;

    this.ws.addEventListener('open', (event) => {
      if (connId !== this.connectionId) return;
      console.log('WebSocket connected');
      this.startHeartbeat();
      this.stableTimer = setTimeout(() => {
        if (connId === this.connectionId) {
          this.reconnectAttempts = 0;
        }
      }, STABLE_THRESHOLD_MS);
      this.onOpenCallbacks.forEach((cb) => cb(event));
    });

    this.ws.onmessage = (event) => {
      if (connId !== this.connectionId) return;
      try {
        const data = JSON.parse(event.data);
        this.onMessageCallbacks.forEach((cb) => cb(data));
      } catch {
        this.onMessageCallbacks.forEach((cb) => cb(event.data));
      }
    };

    this.ws.onerror = (event) => {
      if (connId !== this.connectionId) return;
      console.error('WebSocket error:', event);
      this.onErrorCallbacks.forEach((cb) => cb(event));
    };

    this.ws.addEventListener('close', (event) => {
      if (connId !== this.connectionId) return;
      console.log('WebSocket closed:', event.code, event.reason);
      this.ws = null;
      this.stopHeartbeat();
      if (this.stableTimer) {
        clearTimeout(this.stableTimer);
        this.stableTimer = null;
      }
      this.onCloseCallbacks.forEach((cb) => cb(event));

      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    });
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.heartbeatInterval);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Build a WebSocket URL from a base HTTP(S) URL or relative path.
 * Handles protocol conversion (http->ws, https->wss) and relative paths.
 */
function buildWsBaseUrl(apiBase: string): string {
  let wsUrl = apiBase;

  if (wsUrl.startsWith('/')) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    wsUrl = `${protocol}//${window.location.host}${wsUrl}`;
  } else {
    wsUrl = wsUrl.replace(/^http:/, 'ws:').replace(/^https:/, 'wss:');
  }

  if (wsUrl.endsWith('/')) {
    wsUrl = wsUrl.slice(0, -1);
  }

  return wsUrl;
}

/**
 * Create a WebSocket connection to the scheduler chat endpoint.
 *
 * @param queryParams Optional extra query parameters appended to the URL.
 */
export const createSchedulerWebSocket = (params?: Record<string, string>) => {
  const wsUrl = buildWsBaseUrl(`${ZHINAO_API_BASE}`);
  const finalUrl = `${wsUrl}/scheduler/chat/ws`;

  return new SchedulerWebSocket(finalUrl, params);
};


/**
 * Create a WebSocket connection to the scheduler agentvisual endpoint.
 *
 * @param queryParams Optional extra query parameters appended to the URL.
 */
export const createSchedulerAgentvisualSocket = (params?: Record<string, string>) => {
  const wsUrl = buildWsBaseUrl(`${ZHINAO_API_BASE}`);
  const finalUrl = `${wsUrl}/scheduler/agentvisual/ws`;

  return new SchedulerWebSocket(finalUrl, params);
};
