# Office Chat Per-Agent WS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make each office chat agent keep an independent websocket-backed chat controller so live responses continue even when the user switches to a different agent.

**Architecture:** Extract the single-agent state and websocket logic out of `OfficeChatDock` into a dedicated per-agent controller component. Keep one mounted controller per office agent while the dock is open, render only the selected controller's UI, and let each controller own its own `useChatSession()` and `useChatWebSocket()` chain. Preserve the existing `useChatWebSocket()` pool behavior, but stop relying on selected-agent retargeting.

**Tech Stack:** React, TypeScript, existing office chat hooks, Vitest, Testing Library

---

## File Structure

- Modify: `src/features/office/components/OfficeChatDock.tsx`
- Create: `src/features/office/components/OfficeAgentChatController.tsx`
- Create: `tests/unit/office/officeChatTestUtils.ts`
- Test: `tests/unit/office/OfficeAgentChatController.test.tsx`
- Test: `tests/unit/office/OfficeChatDock.test.tsx`

`OfficeChatDock.tsx`
- Keep layout, agent list, open/close behavior, selected-agent routing, and shared attachment state.
- Stop owning a single `useChatSession()` and `useChatWebSocket()` chain.

`OfficeAgentChatController.tsx`
- Own one agent's `sessionId`, `messages`, `suggestions`, websocket subscription, send/stop/regenerate/edit/history actions, and selected/focused rendering.
- Stay mounted while dock is open, but render `null` when not selected so background agents keep subscriptions without drawing duplicate UI.

`tests/unit/office/OfficeAgentChatController.test.tsx`
- Focused regression coverage for one controller instance and its isolated websocket/session behavior.
- Follow the existing Vitest pattern used in `tests/unit/useZhinaoAgents.test.ts`: use `vi.mock()` to replace `@/features/office/hooks/websocket` with per-agent socket doubles and drive events through explicit helpers such as `emitStream(agentId, delta)` and `emitDone(agentId, text)`.

`tests/unit/office/OfficeChatDock.test.tsx`
- Dock-level regression coverage for multi-agent mounting, selection changes, and controller isolation.
- Prefer rendering the real dock with Testing Library and mocking `@/features/office/hooks/websocket` plus child chat dependencies only where needed for determinism.

`tests/unit/office/officeChatTestUtils.ts`
- Centralize shared fixtures and helpers used by both new test files.
- Own `agentA`, `agentB`, `buildDockProps()`, socket mock registry, `emitStream()`, `emitDone()`, `emitError()`, `connectCallsFor()`, `closeCallsFor()`, `seedConversation()`, and minimal render helpers so Tasks 1, 2, and 4 do not invent separate harnesses.

### Task 1: Add controller-level regression tests first

**Files:**
- Create: `tests/unit/office/OfficeAgentChatController.test.tsx`
- Modify: none
- Test: `tests/unit/office/OfficeAgentChatController.test.tsx`

- [ ] **Step 1: Write the failing test for isolated per-agent streaming**

Before writing the test, add a temporary test-only import strategy that still lets the file compile red. Preferred options:

- create an empty exported placeholder `OfficeAgentChatController` that renders `null`, then write the failing behavior test
- or add the test with `// @ts-expect-error` only for the missing import line, then remove the directive once the component file exists

The goal is a runnable red test for missing behavior, not a TypeScript compile stop.

```tsx
it('keeps receiving stream updates for the same agent while hidden', async () => {
  render(
    <OfficeAgentChatController
      agent={agentA}
      selected={false}
      chatOpen
      scrollToBottom={vi.fn()}
      inputText=""
      setInputText={vi.fn()}
    />
  );

  sendMessageForAgent('agent-a', 'hello');
  emitStream('agent-a', 'chunk-1');
  emitStream('agent-a', 'chunk-2');

  expect(readAgentMessages('agent-a')).toContain('chunk-1chunk-2');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx`

Expected: FAIL because `OfficeAgentChatController` does not exist yet.

- [ ] **Step 3: Add a second failing test for cross-agent isolation**

```tsx
it('does not write agent A websocket events into agent B state', async () => {
  renderTwoControllers();

  emitStream('agent-a', 'alpha');

  expect(readAgentMessages('agent-a')).toContain('alpha');
  expect(readAgentMessages('agent-b')).not.toContain('alpha');
});
```

- [ ] **Step 4: Run the focused test file again**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx`

Expected: FAIL with missing component and/or missing isolated state behavior.

- [ ] **Step 5: Commit the test scaffold**

```bash
git add tests/unit/office/OfficeAgentChatController.test.tsx
git commit -m "test: add office agent chat controller coverage"
```

### Task 2: Add dock-level regression coverage before changing the dock

**Files:**
- Create: `tests/unit/office/OfficeChatDock.test.tsx`
- Modify: none
- Test: `tests/unit/office/OfficeChatDock.test.tsx`

- [ ] **Step 1: Write the failing dock test for selection switching without stream loss**

```tsx
it('keeps agent A streaming after selecting agent B', async () => {
  render(<OfficeChatDock ... />);

  selectAgent('agent-a');
  sendMessage('hello');
  selectAgent('agent-b');
  emitStream('agent-a', 'still-running');
  selectAgent('agent-a');

  expect(screen.getByText(/still-running/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Add the failing dock test for stop isolation**

```tsx
it('stopping agent B does not stop agent A transport', async () => {
  render(<OfficeChatDock ... />);

  startRunFor('agent-a');
  startRunFor('agent-b');
  selectAgent('agent-b');
  clickStop();
  emitDone('agent-a', 'agent a done');

  selectAgent('agent-a');
  expect(screen.getByText(/agent a done/)).toBeInTheDocument();
});
```

- [ ] **Step 3: Add the failing dock test for rapid A/B switching isolation**

```tsx
it('does not cross-write bot updates during rapid A/B switching', async () => {
  render(<OfficeChatDock ... />);

  selectAgent('agent-a');
  selectAgent('agent-b');
  selectAgent('agent-a');
  emitStream('agent-b', 'beta');

  expect(screen.queryByText(/beta/)).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the dock tests and verify they fail**

Run: `npm test -- tests/unit/office/OfficeChatDock.test.tsx`

Expected: FAIL because the current dock still behaves like a single retargeted transport.

- [ ] **Step 5: Commit the dock test scaffold**

```bash
git add tests/unit/office/OfficeChatDock.test.tsx
git commit -m "test: add office chat dock isolation coverage"
```

### Task 3: Extract one per-agent chat controller

**Files:**
- Create: `src/features/office/components/OfficeAgentChatController.tsx`
- Modify: `src/features/office/components/OfficeChatDock.tsx`
- Test: `tests/unit/office/OfficeAgentChatController.test.tsx`
- Test: `tests/unit/office/OfficeChatDock.test.tsx`

- [ ] **Step 1: Create the new controller component with one hook chain per agent**

```tsx
export function OfficeAgentChatController({
  agent,
  chatOpen,
  selected,
  inputText,
  setInputText,
  attachmentsApi,
  scrollToBottom,
}: OfficeAgentChatControllerProps) {
  const {
    sessionId,
    messages,
    setMessages,
    suggestions,
    setSuggestions,
    clearSession,
  } = useChatSession(agent.agentId);

  const {
    send,
    stop,
    loadHistory,
    hasMore,
    isLoadingHistory,
  } = useChatWebSocket({
    open: chatOpen,
    sessionId,
    agentId: agent.agentId,
    setMessages,
    setSuggestions,
    scrollToBottom,
  });

  if (!selected) return null;
  return <SelectedAgentChatView ... />;
}
```

- [ ] **Step 2: Move the existing send/stop/regenerate/edit logic from `OfficeChatDock` into the controller**

Run: no command yet

Expected: all bot placeholder updates and websocket actions now happen inside the per-agent component rather than in the parent dock.

- [ ] **Step 3: Keep shared attachments and composer input only for the selected controller**

```tsx
const attachmentsApi = useAttachments();
const [inputText, setInputText] = useState('');

{agents.map((agent) => (
  <OfficeAgentChatController
    key={agent.agentId}
    agent={agent}
    chatOpen={chatOpen}
    selected={agent.agentId === selectedChatAgentId}
    inputText={inputText}
    setInputText={setInputText}
    attachmentsApi={attachmentsApi}
  />
))}
```

- [ ] **Step 4: Run the focused controller tests**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: PASS for isolated per-agent streaming behavior and the new dock isolation regressions.

- [ ] **Step 5: Commit the controller extraction**

```bash
git add src/features/office/components/OfficeAgentChatController.tsx src/features/office/components/OfficeChatDock.tsx tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx tests/unit/office/officeChatTestUtils.ts
git commit -m "refactor: isolate office chat transport per agent"
```

### Task 4: Verify lifecycle and cleanup behavior

**Files:**
- Modify: `src/features/office/components/OfficeChatDock.tsx`
- Modify: `src/features/office/components/OfficeAgentChatController.tsx`
- Modify: `tests/unit/office/officeChatTestUtils.ts`
- Modify: `tests/unit/office/OfficeChatDock.test.tsx`
- Test: `tests/unit/office/OfficeAgentChatController.test.tsx`
- Test: `tests/unit/office/OfficeChatDock.test.tsx`

- [ ] **Step 1: Add a failing test for `chatOpen` close/reopen reconnect behavior**

```tsx
it('reconnects each agent independently after closing and reopening the dock', async () => {
  const { rerender } = render(<OfficeChatDock chatOpen />);
  rerender(<OfficeChatDock chatOpen={false} />);
  rerender(<OfficeChatDock chatOpen />);

  expect(connectCallsFor('agent-a')).toBeGreaterThan(1);
  expect(connectCallsFor('agent-b')).toBeGreaterThan(1);
});
```

- [ ] **Step 2: Add a failing test for agent removal cleanup**

```tsx
it('unmounts and cleans up only the removed agent controller', async () => {
  const { rerender } = render(<OfficeChatDock agents={[agentA, agentB]} chatOpen />);
  rerender(<OfficeChatDock agents={[agentA]} chatOpen />);

  expect(closeCallsFor('agent-b')).toBeGreaterThan(0);
  expect(closeCallsFor('agent-a')).toBe(0);
});
```

- [ ] **Step 3: Add a failing test for clear-session isolation and websocket error scoping**

This step must prove the spec rule exactly: clearing or starting a new conversation for agent B must not delete, replace, or overwrite agent A's persisted/local history slot.

```tsx
it('clears and errors only the selected agent state', async () => {
  render(<OfficeChatDock ... />);

  seedConversation('agent-a', 'A history');
  seedConversation('agent-b', 'B history');
  selectAgent('agent-b');
  clickNewConversation();
  emitError('agent-a', 'agent a error');

  selectAgent('agent-a');
  expect(screen.getByText(/agent a error/)).toBeInTheDocument();
  expect(screen.getByText(/A history/)).toBeInTheDocument();
  selectAgent('agent-b');
  expect(screen.queryByText(/B history/)).not.toBeInTheDocument();
});
```

- [ ] **Step 4: Run the targeted office chat tests and verify the new lifecycle cases fail**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: FAIL for the new close/reopen, removal, and clear/error isolation cases before implementation.

- [ ] **Step 5: Implement the minimal lifecycle cleanup needed to pass**

Run: no command yet

Expected: open/close and agent removal only affect the matching controller lifecycle.

- [ ] **Step 6: Run the targeted office chat tests**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: PASS with no cross-agent interference and isolated clear/error behavior.

- [ ] **Step 7: Commit the lifecycle fixes**

```bash
git add src/features/office/components/OfficeAgentChatController.tsx src/features/office/components/OfficeChatDock.tsx tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx tests/unit/office/officeChatTestUtils.ts
git commit -m "fix: preserve office chat streams per agent"
```

### Task 5: Final verification

**Files:**
- Modify: none
- Test: `tests/unit/office/OfficeAgentChatController.test.tsx`
- Test: `tests/unit/office/OfficeChatDock.test.tsx`

- [ ] **Step 1: Run the focused office chat unit tests**

Run: `npm test -- tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: PASS

- [ ] **Step 2: Run lints for changed files**

Run: `npx eslint src/features/office/components/OfficeChatDock.tsx src/features/office/components/OfficeAgentChatController.tsx tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: PASS or no new diagnostics for changed files.

If CI requires whole-repo parity, optionally run `npm run lint` after the focused eslint command.

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: PASS

- [ ] **Step 4: Review the diff manually against the spec**

Run: `git diff -- src/features/office/components/OfficeChatDock.tsx src/features/office/components/OfficeAgentChatController.tsx tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx`

Expected: each agent owns isolated controller state and websocket lifecycle.

- [ ] **Step 5: Run a final git status check**

Run: `git status --short`

Expected: working tree is clean if all earlier commits were created as planned. If it is not clean, only intended office chat files may remain.

- [ ] **Step 6: If Task 3 and Task 4 already committed everything, do not create another duplicate commit**

Run: no command

Expected: final verification does not create a redundant commit. Only create an additional commit here if verification uncovered a small follow-up fix that is not already committed.

- [ ] **Step 7: If verification uncovered a small follow-up fix, commit only that delta**

```bash
git add src/features/office/components/OfficeChatDock.tsx src/features/office/components/OfficeAgentChatController.tsx tests/unit/office/OfficeAgentChatController.test.tsx tests/unit/office/OfficeChatDock.test.tsx
git commit -m "chore: finish office chat per-agent ws verification follow-up"
```
