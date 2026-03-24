import { afterEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";

const socketMock = vi.hoisted(() => {
  let messageCallback: ((message: unknown) => void) | null = null;
  let openCallback: (() => void) | null = null;
  let errorCallback: (() => void) | null = null;

  return {
    connect: vi.fn(),
    close: vi.fn(),
    emitMessage(message: unknown) {
      messageCallback?.(message);
    },
    emitOpen() {
      openCallback?.();
    },
    emitError() {
      errorCallback?.();
    },
    onError: vi.fn((callback: () => void) => {
      errorCallback = callback;
      return () => {
        if (errorCallback === callback) errorCallback = null;
      };
    }),
    onMessage: vi.fn((callback: (message: unknown) => void) => {
      messageCallback = callback;
      return () => {
        if (messageCallback === callback) messageCallback = null;
      };
    }),
    onOpen: vi.fn((callback: () => void) => {
      openCallback = callback;
      return () => {
        if (openCallback === callback) openCallback = null;
      };
    }),
    reset() {
      messageCallback = null;
      openCallback = null;
      errorCallback = null;
      this.connect.mockClear();
      this.close.mockClear();
      this.onError.mockClear();
      this.onMessage.mockClear();
      this.onOpen.mockClear();
    },
  };
});

vi.mock("@/features/office/hooks/websocket", () => ({
  createSchedulerAgentvisualSocket: () => socketMock,
}));

import { useZhinaoAgents } from "@/features/office/hooks/useZhinaoAgents";

describe("useZhinaoAgents", () => {
  afterEach(() => {
    cleanup();
    socketMock.reset();
    vi.clearAllMocks();
  });

  it("keeps waiting agents as running across list and status messages", async () => {
    const hydrateAgents = vi.fn();
    const dispatch = vi.fn();
    const setLoading = vi.fn();
    const setError = vi.fn();

    const { result } = renderHook(() =>
      useZhinaoAgents({
        hydrateAgents,
        dispatch,
        setLoading,
        setError,
      }),
    );

    act(() => {
      socketMock.emitMessage({
        type: "agent_list",
        data: {
          agents: [{ agentId: "agent-1", name: "Agent One", status: "waiting" }],
        },
      });
    });

    await waitFor(() => {
      expect(result.current.activities).toHaveLength(1);
      expect(result.current.activities[0]?.status).toBe("waiting");
      expect(dispatch).toHaveBeenCalledWith({
        type: "updateAgent",
        agentId: "agent-1",
        patch: {
          status: "running",
          runId: "zhinao-run-agent-1",
        },
      });
    });

    dispatch.mockClear();

    act(() => {
      socketMock.emitMessage({
        type: "agent_status",
        data: {
          agentId: "agent-1",
          status: "working",
        },
      });
    });

    await waitFor(() => {
      expect(result.current.activities[0]?.status).toBe("working");
      expect(dispatch).toHaveBeenCalledWith({
        type: "updateAgent",
        agentId: "agent-1",
        patch: {
          status: "running",
          runId: "zhinao-run-agent-1",
        },
      });
    });
  });
});
