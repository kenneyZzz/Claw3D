import { createElement } from 'react';
import { act, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/office/hooks/websocket', async () => {
  const mod = await import('./officeChatTestUtils');
  return {
    createSchedulerChatSocket: mod.createMockSchedulerWebSocket,
  };
});

import { OfficeAgentChatController } from '@/features/office/components/OfficeAgentChatController';
import {
  agentA,
  emitDone,
  renderWithProviders,
  resetOfficeChatTestState,
  sentPayloadsFor,
} from './officeChatTestUtils';

describe('OfficeAgentChatController', () => {
  afterEach(() => {
    cleanup();
    resetOfficeChatTestState();
    vi.clearAllMocks();
  });

  it('keeps receiving stream updates for the same agent while hidden', async () => {
    const { rerender } = renderWithProviders(
      createElement(OfficeAgentChatController, {
        agent: agentA,
        chatOpen: true,
        selected: true,
      }),
    );

    const composer = screen.getByRole('textbox');
    fireEvent.change(composer, { target: { value: 'hello' } });
    fireEvent.keyDown(composer, { key: 'Enter' });

    await waitFor(() => {
      expect(sentPayloadsFor(agentA.agentId)).toHaveLength(1);
    });

    rerender(
      createElement(OfficeAgentChatController, {
        agent: agentA,
        chatOpen: true,
        selected: false,
      }),
    );

    act(() => {
      emitDone(agentA.agentId, 'still-running');
    });

    rerender(
      createElement(OfficeAgentChatController, {
        agent: agentA,
        chatOpen: true,
        selected: true,
      }),
    );

    await waitFor(() => {
      expect(screen.getByText('still-running')).toBeInTheDocument();
    });
  });
});
