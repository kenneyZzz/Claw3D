import { createElement, useMemo, useState } from 'react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/office/hooks/websocket', async () => {
  const mod = await import('./officeChatTestUtils');
  return {
    createSchedulerWebSocket: mod.createMockSchedulerWebSocket,
  };
});

import { OfficeChatDock } from '@/features/office/components/OfficeChatDock';
import {
  agentA,
  agentB,
  closeCallsFor,
  connectCallsFor,
  emitDone,
  renderWithProviders,
  resetOfficeChatTestState,
  seedConversation,
  sentPayloadsFor,
} from './officeChatTestUtils';

function OfficeChatDockHarness() {
  const agents = useMemo(() => [agentA, agentB], []);
  const [chatOpen, setChatOpen] = useState(true);
  const [selectedChatAgentId, setSelectedChatAgentId] = useState<string | null>(
    agentA.agentId,
  );
  const runningCount = agents.filter((agent) => agent.status === 'running').length;

  return createElement(OfficeChatDock, {
    sidebarOpen: false,
    debugEnabled: false,
    chatOpen,
    runningCount,
    agents,
    selectedChatAgentId,
    onToggleChat: () => setChatOpen((current) => !current),
    onSelectAgent: setSelectedChatAgentId,
  });
}

describe('OfficeChatDock', () => {
  afterEach(() => {
    cleanup();
    resetOfficeChatTestState();
    vi.clearAllMocks();
  });

  it('keeps agent A streaming after selecting agent B', async () => {
    renderWithProviders(createElement(OfficeChatDockHarness));

    const composer = screen.getByRole('textbox');
    fireEvent.change(composer, { target: { value: 'hello from a' } });
    fireEvent.keyDown(composer, { key: 'Enter' });

    await waitFor(() => {
      expect(sentPayloadsFor(agentA.agentId)).toHaveLength(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /Agent B/i }));

    act(() => {
      emitDone(agentA.agentId, 'agent a final');
    });

    fireEvent.click(screen.getByRole('button', { name: /Agent A/i }));

    await waitFor(() => {
      expect(screen.getByText('agent a final')).toBeInTheDocument();
    });
  });

  it('reconnects each agent independently after closing and reopening the dock', async () => {
    renderWithProviders(createElement(OfficeChatDockHarness));

    await waitFor(() => {
      expect(connectCallsFor(agentA.agentId)).toBe(1);
      expect(connectCallsFor(agentB.agentId)).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /hide chat/i }));

    await waitFor(() => {
      expect(closeCallsFor(agentA.agentId)).toBe(1);
      expect(closeCallsFor(agentB.agentId)).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /chat/i }));

    await waitFor(() => {
      expect(connectCallsFor(agentA.agentId)).toBe(2);
      expect(connectCallsFor(agentB.agentId)).toBe(2);
    });
  });

  it('clearing agent B conversation does not clear agent A history', async () => {
    seedConversation(agentA.agentId, 'A history');
    seedConversation(agentB.agentId, 'B history');

    renderWithProviders(createElement(OfficeChatDockHarness));

    expect(screen.getByText('A history')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Agent B/i }));
    expect(screen.getByText('B history')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('New conversation'));

    fireEvent.click(screen.getByRole('button', { name: /Agent A/i }));
    expect(screen.getByText('A history')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Agent B/i }));
    expect(screen.queryByText('B history')).not.toBeInTheDocument();
  });
});
