# Research Progress Streaming

## Decision

The UI uses Server-Sent Events (SSE) for live progress from one research run. The browser
does not call individual analyst APIs or orchestrate the committee; Hono owns the LangGraph
run and forwards task lifecycle events.

The existing `POST /research` endpoint remains available as a synchronous fallback. The UI
uses `POST /research/stream` during normal operation.

## Event flow

```text
run.started
  ↓
stage.started / stage.completed
  ↓
sec.completed / market.completed
  ↓
analyst.completed (once per analyst)
  ↓
draft.completed / challenge.completed
  ↓
run.interrupted
  ↓
run.resumed
  ↓
run.completed
```

Stages include ticker validation, SEC evidence, Massive market data, the three analysts,
chair draft, skeptic challenge, human sign-off, and final chair synthesis.

## Progressive artifacts

The graph streams `updates` alongside `tasks` and `values`. Task events drive the timeline,
update events expose selected structured artifacts, and the latest values snapshot remains the
authoritative final response.

The API deliberately forwards validated domain artifacts instead of the graph's complete internal
state:

- SEC fundamentals and their source become visible as soon as EDGAR finishes.
- The Massive snapshot and historical price series render independently of SEC.
- Each analyst report appears when that analyst completes.
- The UI announces that the chair draft exists but does not show its contents before review.
- The skeptic challenge appears before final chair synthesis.
- `run.interrupted` carries a JSON-serializable review request and stable run ID.
- A decision sent to the resume endpoint continues the same LangGraph `thread_id`.
- `run.completed` replaces the accumulated partial state with the authoritative final result.

This keeps one API request and one LangGraph run while avoiding an empty results area during a
long-running committee workflow.

## Why SSE

- It supports a single POST request with a request body and an open response stream.
- It maps naturally to one LangGraph execution.
- It is simpler than WebSockets for server-to-browser progress.
- It keeps shared state and retries on the server.
- It leaves room for a future background-job model without coupling the UI to graph nodes.

The frontend parses the response stream with `ReadableStream` because native `EventSource`
only supports GET requests, while research needs a POST body.

The initial stream may end normally at an interrupt without a final response. The frontend then
opens a second SSE response with `POST /research/:runId/resume/stream`. The server supplies the
decision through a LangGraph `Command({ resume })`; it does not replay the completed evidence and
analyst nodes.

The UI presents one detailed timeline grouped into Validate, Evidence, Committee, and Review.
The earlier four-step summary was removed because it duplicated the node-level timeline without
adding new information.

## Conversational agent events

Focused follow-up questions use a separate `POST /assistant/stream` response with a smaller event
contract:

```text
assistant.started
  ↓
tool.requested / tool.completed (zero to four times)
  ↓
answer.completed
```

The API derives these events from LangGraph agent and `ToolNode` updates. Raw model messages and
full tool payloads remain server-side; the browser receives tool names, validated arguments, the
final answer, and the collected source records.
