'use client';

import { useEffect, useMemo } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';
import type { AgentState } from '@/features/agents/state/store';
import { useI18n } from '@/lib/i18n';
import { OfficeAgentChatController } from '@/features/office/components/OfficeAgentChatController';

interface OfficeChatDockProps {
  sidebarOpen: boolean;
  debugEnabled: boolean;
  chatOpen: boolean;
  runningCount: number;
  agents: AgentState[];
  selectedChatAgentId: string | null;
  onToggleChat: () => void;
  onSelectAgent: (agentId: string) => void;
}

export function OfficeChatDock({
  sidebarOpen,
  debugEnabled,
  chatOpen,
  runningCount,
  agents,
  selectedChatAgentId,
  onToggleChat,
  onSelectAgent,
}: OfficeChatDockProps) {
  const { t } = useI18n();

  const focusedChatAgent = useMemo(
    () =>
      selectedChatAgentId
        ? (agents.find((a) => a.agentId === selectedChatAgentId) ?? null)
        : null,
    [selectedChatAgentId, agents],
  );

  useEffect(() => {
    const selectedStillExists = selectedChatAgentId
      ? agents.some((agent) => agent.agentId === selectedChatAgentId)
      : false;
    if (
      chatOpen &&
      agents.length > 0 &&
      (!selectedChatAgentId || !selectedStillExists)
    ) {
      onSelectAgent(agents[0]!.agentId);
    }
  }, [chatOpen, selectedChatAgentId, agents, onSelectAgent]);

  return (
    <div
      className={`fixed bottom-3 z-30 flex flex-col items-end gap-2 ${sidebarOpen ? 'right-84' : 'right-3'} ${debugEnabled ? 'hidden' : ''}`}
    >
      {chatOpen ? (
        <div className="flex h-[560px] w-[660px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-2xl opacity-90">
          {/* Agent sidebar */}
          <div className="flex w-36 shrink-0 flex-col border-r border-[var(--border)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] px-3 py-2">
              <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">
                {t('office.agents')}
              </span>
              <span className="text-[10px] text-[var(--text-muted)]">
                {agents.length}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {agents.length === 0 ? (
                <div className="px-3 py-4 text-xs text-[var(--text-muted)]">
                  {t('office.noAgents')}
                </div>
              ) : (
                agents.map((agent) => {
                  const isSelected = agent.agentId === selectedChatAgentId;
                  return (
                    <button
                      key={agent.agentId}
                      type="button"
                      onClick={() => onSelectAgent(agent.agentId)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-white/10 text-white'
                          : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                          agent.status === 'error'
                            ? 'bg-red-400'
                            : ['running', 'working'].includes(agent.status)
                              ? 'bg-green-400'
                              : 'bg-yellow-400'
                        }`}
                      />
                      <span className="min-w-0 flex-1 truncate text-[11px]">
                        {agent.name || agent.agentId}
                      </span>
                      {agent.status === 'running' && (
                        <span className="shrink-0 text-[9px] text-emerald-400/70">
                          {t('office.connected')}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex min-w-0 flex-1 flex-col">
            {focusedChatAgent ? (
              agents.map((agent) => (
                <OfficeAgentChatController
                  key={agent.agentId}
                  agent={agent}
                  chatOpen={chatOpen}
                  selected={agent.agentId === selectedChatAgentId}
                />
              ))
            ) : (
              <div className="flex flex-1 items-center justify-center text-sm text-[var(--text-muted)]">
                {t('office.selectAgentToChat')}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Toggle button */}
      <button
        type="button"
        onClick={onToggleChat}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]/90 px-3 py-1.5 text-xs font-medium tracking-wider text-[var(--text-muted)] shadow-lg backdrop-blur transition-colors hover:border-[var(--accent)]/60 hover:text-[var(--text)]"
      >
        {chatOpen ? (
          <>
            <ChevronDown className="h-3.5 w-3.5" />
            <span>{t('office.hideChat')}</span>
          </>
        ) : (
          <>
            <MessageSquare className="h-3.5 w-3.5" />
            <span>{t('office.chat')}</span>
            {runningCount > 0 ? (
              <span className="rounded bg-[var(--accent)]/20 px-1 text-[10px] text-[var(--accent)]">
                {runningCount}
              </span>
            ) : null}
          </>
        )}
      </button>
    </div>
  );
}
