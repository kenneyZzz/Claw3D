type AgentWithId = {
  agentId: string;
};

const AGENT_ID_SEPARATOR = "\x1f";

export const buildOfficeAgentIdsKey = (agents: AgentWithId[]): string =>
  agents.map((agent) => agent.agentId).join(AGENT_ID_SEPARATOR);
