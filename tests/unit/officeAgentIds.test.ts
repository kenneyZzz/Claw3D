import { describe, expect, it } from "vitest";

import { buildOfficeAgentIdsKey } from "@/lib/office/agentIds";

describe("buildOfficeAgentIdsKey", () => {
  it("stays stable when non-id agent fields change", () => {
    const initial = [
      { agentId: "main", name: "Main", status: "idle" },
      { agentId: "qa", name: "QA", status: "running" },
    ];
    const updated = [
      { agentId: "main", name: "Primary", status: "running" },
      { agentId: "qa", name: "Testing", status: "idle" },
    ];

    expect(buildOfficeAgentIdsKey(updated)).toBe(buildOfficeAgentIdsKey(initial));
  });

  it("changes when the active agent ids change", () => {
    const previous = [
      { agentId: "main" },
      { agentId: "qa" },
    ];
    const next = [
      { agentId: "main" },
      { agentId: "ops" },
    ];

    expect(buildOfficeAgentIdsKey(next)).not.toBe(buildOfficeAgentIdsKey(previous));
  });
});
