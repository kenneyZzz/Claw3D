// export const ZHINAO_API_HOST = "http://172.16.8.149:88";
export const ZHINAO_API_HOST = "http://192.168.0.113:88";
export const ZHINAO_API_BASE = `${ZHINAO_API_HOST}/api`;
// export const ZHINAO_WS_CHAT_URL = `ws://172.16.8.149:88/api/scheduler/chat/ws`;
const DEFAULT_AUTH_CODE = "zn_dc37625cc08846998e8b0c90715d5fd5";

export const AGENT_ACTIVITY_POLL_INTERVAL_MS = 5_000;

let _cachedUserId: string | null = null;
let _cachedAuthCode: string | null = null;

/**
 * Cache userId and X-Auth-Code extracted from URL query params.
 * Should be called once when the office page mounts.
 */
export function setZhinaoAuthParams(params: {
  userId?: string | null;
  authCode?: string | null;
}) {
  if (params.userId) _cachedUserId = params.userId;
  if (params.authCode) _cachedAuthCode = params.authCode;
}

export function getZhinaoUserId(): string | null {
  return _cachedUserId;
}

export function getZhinaoAuthCode(): string {
  return _cachedAuthCode || DEFAULT_AUTH_CODE;
}
