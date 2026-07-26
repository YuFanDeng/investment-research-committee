# Human Approval Interrupt

## Decision

The interactive research workflow pauses after the skeptic challenge and before final chair
synthesis. This is the point where all automated opinions are visible but the final memo has not
yet been published.

The reviewer has three choices:

- **Approve** — continue to final synthesis.
- **Request revision** — continue to final synthesis and require the chair to address written
  feedback.
- **Reject** — end the run without creating a final memo.

## Why this is a LangGraph interrupt

This is workflow state, not a modal layered over a completed API call. The approval node calls
LangGraph's `interrupt()` function. A `MemorySaver` stores the checkpoint under a stable
`thread_id`, which is also exposed to the UI as the run ID. Resumption sends a
`Command({ resume: decision })` with that same ID.

The graph therefore resumes from the approval boundary without refetching SEC data, market data,
or rerunning analysts. Conditional routing sends approve and revise decisions to the final chair
and reject decisions directly to the graph end.

## API and event contract

The initial request remains:

```text
POST /research/stream
```

When review is required, it emits `run.interrupted` with the run ID and review context. The UI
resumes it with:

```text
POST /research/:runId/resume/stream
```

The resume body contains a validated decision and optional feedback. The resumed response emits
normal stage events followed by `run.completed`.

The synchronous `POST /research` route intentionally auto-approves. This preserves a simple
non-interactive integration path while the main UI demonstrates human-in-the-loop orchestration.

## Demo and production boundary

`MemorySaver` is appropriate for a single-process local demo, but paused runs disappear if the API
process restarts. A production implementation should use a durable LangGraph checkpointer and bind
each run ID to an authenticated user before accepting a resume command.
