import { describe, expect, it, vi } from 'vitest';
import { activateSceneAgent } from '@/features/retro-office/core/agentSelection';

describe('activateSceneAgent', () => {
  it('builds a focus preset and notifies the selected agent id', () => {
    const onSelectAgent = vi.fn();

    const preset = activateSceneAgent({
      agentId: 'agent-a',
      cameraPosition: [12, 12, 12],
      currentTarget: [0, 0, 0],
      nextTarget: [4, 0, -2],
      onSelectAgent,
    });

    expect(onSelectAgent).toHaveBeenCalledWith('agent-a');
    expect(preset).toEqual({
      pos: [16, 12, 10],
      target: [4, 0, -2],
      transition: {
        durationMs: 550,
        easing: 'easeOutCubic',
      },
    });
  });
});
