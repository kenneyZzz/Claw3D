"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentStoreSeed, AgentState } from "@/features/agents/state/store";
import {
  ZHINAO_API_BASE,
  AGENT_ACTIVITY_POLL_INTERVAL_MS,
} from "@/lib/zhinao-api";

export type ZhinaoAgentActivity = {
  agentId: string;
  name: string;
  nameEn?: string;
  state: "idle" | "working" | "waiting" | "offline";
  lastActive: number;
  pops?: string[];
};

type RawActivityAgent = {
  agentId: string;
  name: string;
  nameEn?: string;
  state: string;
  lastActive: number | null;
  pops?: string[];
};

type BubbleTextsMap = Map<string, string[]>;

function mapStateString(
  s: string,
): "idle" | "working" | "waiting" | "offline" {
  if (s === "working" || s === "idle" || s === "waiting" || s === "offline")
    return s;
  return "idle";
}

function activityToSeed(a: ZhinaoAgentActivity): AgentStoreSeed {
  return {
    agentId: a.agentId,
    name: a.name,
    sessionKey: `zhinao-${a.agentId}`,
  };
}

function activityToStatus(
  a: ZhinaoAgentActivity,
): AgentState["status"] {
  if (a.state === "working" || a.state === "waiting") return "running";
  return "idle";
}

interface UseZhinaoAgentsOptions {
  hydrateAgents: (agents: AgentStoreSeed[], selectedAgentId?: string) => void;
  dispatch: React.Dispatch<any>;
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
  const prevStatesRef = useRef<Map<string, string>>(new Map());

  const fetchBubbleTexts = useCallback(async () => {
    try {
      const res = await fetch(`${ZHINAO_API_BASE}/list/public`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      const list: Array<{ agentId?: string; id?: string; pops?: string[] }> =
        data?.data?.list || data?.data || [];
      if (!Array.isArray(list)) return;
      const map = new Map<string, string[]>();
      for (const agent of list) {
        const id = agent.agentId || agent.id;
        const msgs = agent.pops;
        if (id && Array.isArray(msgs) && msgs.length > 0) {
          map.set(id, msgs);
        }
      }
      setBubbleTexts(map);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    void fetchBubbleTexts();
  }, [fetchBubbleTexts]);

  useEffect(() => {
    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const scheduleNext = (delay: number) => {
      if (!cancelled) timerId = setTimeout(fetchAgents, delay);
    };

    const fetchAgents = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${ZHINAO_API_BASE}/activity/public`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const rawAgents: RawActivityAgent[] = data?.data?.agents || [];

        const newActivities: ZhinaoAgentActivity[] = rawAgents.map((a) => ({
          agentId: a.agentId,
          name: a.name,
          nameEn: a.nameEn,
          state: mapStateString(a.state),
          lastActive: a.lastActive ?? 0,
          pops: a.pops,
        }));

        setActivities(newActivities);

        const seeds = newActivities
          .filter((a) => a.state !== "offline")
          .map(activityToSeed);

        hydrateAgents(seeds);

        for (const a of newActivities) {
          if (a.state === "offline") continue;
          const status = activityToStatus(a);
          dispatch({
            type: "updateAgent",
            agentId: a.agentId,
            patch: {
              status,
              runId: status === "running" ? `zhinao-run-${a.agentId}` : null,
            },
          });
        }

        const stateMap = new Map<string, string>();
        for (const a of newActivities) stateMap.set(a.agentId, a.state);
        prevStatesRef.current = stateMap;

        setAgentsLoaded(true);
        setError(null);
        scheduleNext(AGENT_ACTIVITY_POLL_INTERVAL_MS);
      } catch (e) {
        console.error("Failed to fetch zhinao agents:", e);
        setError(
          e instanceof Error ? e.message : "Failed to fetch agents",
        );
        scheduleNext(60_000);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();

    return () => {
      cancelled = true;
      if (timerId !== null) clearTimeout(timerId);
    };
  }, [hydrateAgents, dispatch, setLoading, setError]);

  return { agentsLoaded, activities, bubbleTexts };
}
