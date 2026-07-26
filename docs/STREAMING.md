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
run.completed
```

Stages include ticker validation, SEC evidence, Massive market data, the three analysts,
chair draft, skeptic challenge, and final chair synthesis.

## Why SSE

- It supports a single POST request with a request body and an open response stream.
- It maps naturally to one LangGraph execution.
- It is simpler than WebSockets for server-to-browser progress.
- It keeps shared state and retries on the server.
- It leaves room for a future background-job model without coupling the UI to graph nodes.

The frontend parses the response stream with `ReadableStream` because native `EventSource`
only supports GET requests, while research needs a POST body.

The UI presents one detailed timeline grouped into Validate, Evidence, Committee, and Review.
The earlier four-step summary was removed because it duplicated the node-level timeline without
adding new information.
