# Office Chat Per-Agent WS Design

## Goal

Ensure each office chat agent owns an independent WebSocket-backed chat controller so that:

- agent A can keep streaming while the user is viewing agent B
- switching the selected chat agent never steals or resets another agent's live transport
- each agent keeps isolated session state, message history, suggestions, and stop behavior

## Current Problem

`OfficeChatDock` currently renders chat state for only the selected agent and calls `useChatWebSocket()` once for that selected agent. Although `useChatWebSocket()` has a module-level socket pool keyed by `agentId`, only the selected agent is actively subscribed to messages and writing them into React state.

This means the UI effectively behaves like a single active chat transport that is retargeted as selection changes, instead of multiple concurrently active agent chats.

## Recommended Approach

Introduce a per-agent controller layer inside the office chat dock flow. Each agent gets a stable controller instance that owns:

- `useChatSession(agentId)` state
- `useChatWebSocket({ agentId, open: chatOpen })`
- message update handlers for send, stop, regenerate, edit, and history loading

The dock should keep a map keyed by `agentId` and render only the currently selected controller, while leaving the other controllers mounted and subscribed whenever `chatOpen` is true.

Within the office chat dock, there must be at most one mounted chat controller per `agentId` and at most one active websocket subscription owner per `agentId`.

## Component Boundaries

### `OfficeChatDock`

Responsibilities:

- manage selected agent display
- create and retain one chat controller per office chat agent while the dock is open
- route the currently focused agent's controller into the shared chat UI

Non-responsibilities:

- no direct single-agent websocket ownership
- no single global chat session state

### Per-agent chat controller

Responsibilities:

- own one agent's persisted session data
- own one agent's websocket subscription lifecycle
- expose the focused-agent-friendly API currently consumed by the dock UI

This can be implemented as either:

- an extracted child component per agent that stays mounted, or
- a new hook-backed manager that stores per-agent state in a keyed structure

The preferred implementation is an extracted child component or controller hook with one React hook chain per agent because it aligns naturally with hook rules and keeps each agent isolated.

## Data Flow

1. `OfficeScreen` passes `agents`, `chatOpen`, and `selectedChatAgentId` into `OfficeChatDock`.
2. `OfficeChatDock` ensures there is one mounted controller per agent.
3. When `chatOpen` is true, every mounted controller keeps its own websocket subscription active.
4. Incoming websocket events update only that controller's local session state.
5. The dock renders the selected controller's messages, suggestions, history state, and actions.
6. Switching agents changes only which controller is displayed, not which transports are alive.

## Lifecycle Rules

- when `chatOpen` becomes `true`, the dock mounts one controller for each current office chat agent and each controller restores its own persisted session state
- when `chatOpen` becomes `false`, all office chat controllers detach and close their active websocket subscriptions for this dock
- when `chatOpen` becomes `true` again, each agent controller reconnects using its own existing persisted session state
- switching `selectedChatAgentId` must never close, replace, or retarget another agent's active controller
- if an agent disappears from the office agent list, its controller must unmount and release subscriptions cleanly

## Error Handling

- websocket errors remain scoped to the owning agent's last bot message
- stopping a run only closes and recreates the selected agent's websocket
- clearing a session only clears the selected agent's persisted storage slot
- agent removal should unmount that agent's controller and release subscriptions cleanly
- a reconnect or stop operation for agent A must never affect agent B's transport or local state

## Testing Strategy

Add regression coverage for the independent-controller behavior:

- agent A and agent B can both establish chat websocket controllers
- messages streamed to agent A do not appear in agent B
- switching selection does not stop agent A from receiving later chunks
- stopping one agent does not affect another agent's active controller
- closing and reopening the dock reconnects each agent independently while preserving each agent's local persisted session
- removing an agent from the list cleans up only that agent's controller
- rapid A/B selection changes do not cause message cross-talk or mis-applied bot updates

If practical, add a focused unit test around the new per-agent controller abstraction rather than relying only on UI-level tests.

## Files Likely To Change

- `src/features/office/components/OfficeChatDock.tsx`
- possibly a new extracted controller component or hook under `src/features/office/components` or `src/features/office/hooks`
- `tests/unit/...` for new regression coverage

## Out of Scope

- changing scheduler backend websocket protocol
- redesigning the office chat UI
- changing non-office agent chat behavior in `AgentChatPanel`
