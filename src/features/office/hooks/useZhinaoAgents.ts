"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentStoreSeed, AgentState } from "@/features/agents/state/store";
import { createSchedulerAgentvisualSocket } from "./websocket";
import { getZhinaoClientId } from "@/lib/zhinao-api";

type ZhinaoAgentPresenceStatus = "idle" | "working";

export type ZhinaoAgentActivity = {
  agentId: string;
  name: string;
  status: ZhinaoAgentPresenceStatus;
};

type RawActivityAgent = {
  agentId: string;
  name: string;
  status?: string;
  lastActive?: number | null;
};

type AgentUpdateAction = {
  type: "updateAgent";
  agentId: string;
  patch: Partial<AgentState>;
};

type AgentListMessage = {
  type: "agent_list";
  data?: {
    agents?: RawActivityAgent[];
  };
};

type AgentStatusMessage = {
  type: "agent_status";
  data?: {
    agentId?: string;
    status?: string;
  };
};

type AgentPopMessage = {
  type: "pop";
  data?: {
    agentId?: string;
    popMessage?: string;
  };
};

type SchedulerAgentVisualMessage =
  | AgentListMessage
  | AgentStatusMessage
  | AgentPopMessage
  | {
      type?: string;
      data?: unknown;
    };

type BubbleTextsMap = Map<string, string[]>;

function mapStatusString(
  s?: string,
): ZhinaoAgentPresenceStatus {
  return s === "working" ? "working" : "idle";
}

function activityToSeed(a: ZhinaoAgentActivity): AgentStoreSeed {
  return {
    agentId: a.agentId,
    name: a.name,
    sessionKey: `zhinao-${a.agentId}`,
  };
}

interface UseZhinaoAgentsOptions {
  hydrateAgents: (agents: AgentStoreSeed[], selectedAgentId?: string) => void;
  dispatch: React.Dispatch<AgentUpdateAction>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export function useZhinaoAgents({
  hydrateAgents,
  dispatch,
  setLoading,
  setError,
}: UseZhinaoAgentsOptions) {
  const [agentsLoaded, setAgentsLoaded] = useState(false);
  const [activities, setActivities] = useState<ZhinaoAgentActivity[]>([]);
  const [bubbleTexts, setBubbleTexts] = useState<BubbleTextsMap>(new Map());
  const prevStatusesRef = useRef<Map<string, ZhinaoAgentPresenceStatus>>(new Map());

  const hydrateRef = useRef(hydrateAgents);
  const dispatchRef = useRef(dispatch);
  const setLoadingRef = useRef(setLoading);
  const setErrorRef = useRef(setError);
  useEffect(() => {
    hydrateRef.current = hydrateAgents;
    dispatchRef.current = dispatch;
    setLoadingRef.current = setLoading;
    setErrorRef.current = setError;
  }, [hydrateAgents, dispatch, setLoading, setError]);

  useEffect(() => {
    const clientId = getZhinaoClientId();
    const socket = createSchedulerAgentvisualSocket({ 'X-Client-Id': clientId });

    const handleAgentList = (rawAgents: RawActivityAgent[]) => {
      const newActivities: ZhinaoAgentActivity[] = rawAgents.map((a) => ({
        agentId: a.agentId,
        name: a.name,
        status: "idle",
      }));

      setActivities(newActivities);

      const seeds = newActivities.map(activityToSeed);

      hydrateRef.current(seeds);

      for (const a of newActivities) {
        const isWorking = a.status === "working";
        dispatchRef.current({
          type: "updateAgent",
          agentId: a.agentId,
          patch: {
            status: isWorking ? "running" : "idle",
            runId: isWorking ? `zhinao-run-${a.agentId}` : null,
          },
        });
      }

      const statusMap = new Map<string, ZhinaoAgentPresenceStatus>();
      for (const a of newActivities) statusMap.set(a.agentId, a.status);
      prevStatusesRef.current = statusMap;

      setAgentsLoaded(true);
      setErrorRef.current(null);
    };

    const unsubMessage = socket.onMessage((msg: unknown) => {
      if (!msg || typeof msg !== "object") return;
      const { type, data } = msg as SchedulerAgentVisualMessage;

      if (type === "agent_list") {
        const rawAgents: RawActivityAgent[] = (data as AgentListMessage["data"])?.agents || [];
        handleAgentList(rawAgents);
      } else if (type === "agent_status") {
        const payload = data as AgentStatusMessage["data"];
        const agentId: string | undefined = payload?.agentId;
        const newStatus = mapStatusString(payload?.status);
        if (agentId) {
          setActivities((prev) =>
            prev.map((a) =>
              a.agentId === agentId ? { ...a, status: newStatus } : a,
            ),
          );
          const isWorking = newStatus === "working";
          dispatchRef.current({
            type: "updateAgent",
            agentId,
            patch: {
              status: isWorking ? "running" : "idle",
              runId: isWorking ? `zhinao-run-${agentId}` : null,
            },
          });
          prevStatusesRef.current = new Map(prevStatusesRef.current).set(agentId, newStatus);
        }
      } else if (type === "pop") {
        const payload = data as AgentPopMessage["data"];
        const agentId: string | undefined = payload?.agentId;
        const popMessage: string | undefined = payload?.popMessage;
        if (agentId && popMessage) {
          setBubbleTexts((prev) => {
            const next = new Map(prev);
            const existing = next.get(agentId) || [];
            next.set(agentId, [...existing, popMessage]);
            return next;
          });
        }
      }
    });

    const unsubOpen = socket.onOpen(() => {
      setLoadingRef.current(false);
      setErrorRef.current(null);
    });

    const unsubError = socket.onError(() => {
      setErrorRef.current("WebSocket connection error");
    });

    setLoadingRef.current(true);
    socket.connect();

    return () => {
      unsubMessage();
      unsubOpen();
      unsubError();
      socket.close();
    };
  }, []);

  return { agentsLoaded, activities, bubbleTexts };
}
