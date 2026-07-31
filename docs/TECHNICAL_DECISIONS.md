# Technical Decisions

This document records the initial implementation choices for the Investment Research Committee project.

## Locked-in stack

| Area                    | Decision                                          | Why                                                                                                                  |
| ----------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Frontend                | React + TypeScript                                | Matches the team's frontend strengths and supports a polished, interactive research dashboard.                       |
| Build tooling           | Vite                                              | Fast local development and a lightweight SPA setup. Server-side rendering is not required for the initial dashboard. |
| API server              | Hono + TypeScript                                 | A small HTTP layer for starting and resuming research runs, streaming progress, and protecting API keys.             |
| Agent orchestration     | LangGraph.js                                      | Keeps the workflow, graph state, conditional routing, critique, and later human approval in TypeScript.              |
| Runtime validation      | Zod                                               | Validates untrusted runtime data and infers TypeScript types from the same schemas.                                  |
| Primary evidence source | SEC EDGAR                                         | Provides authoritative U.S. company filing and financial data.                                                       |
| Market data provider    | Massive                                           | Documented TypeScript-friendly API with a free end-of-day tier suitable for the valuation analyst demo.              |
| Code formatting         | Prettier                                          | Keeps source files consistently readable and reduces formatting noise in reviews.                                    |
| Progress transport      | Server-Sent Events                                | Streams one LangGraph run to the React UI without making the browser orchestrate internal agents.                    |
| Partial-result delivery | Typed SSE artifact events                         | Reveals SEC, market, analyst, and skeptic results as nodes finish while preserving one authoritative final response. |
| UI icons                | lucide-react                                      | Provides a consistent, lightweight icon vocabulary for workflow, evidence, and market states.                        |
| Price chart             | Recharts                                          | Renders the historical closes already returned by Massive without introducing a second charting abstraction.         |
| UI component strategy   | Domain components + CSS tokens                    | Keeps the dashboard visually distinctive and makes the frontend architecture easy to explain in an interview.        |
| Ollama context window   | Configurable via `OLLAMA_NUM_CTX`, default `4096` | Keeps local development compatible with the current model while allowing larger-context models later.                |
| Human review            | LangGraph interrupt after skeptic challenge       | Demonstrates checkpointed pause/resume, explicit user control, and conditional graph routing before publication.     |
| Demo checkpointing      | LangGraph `MemorySaver`                           | Preserves paused runs by `thread_id` without adding a database; durable persistence remains a later production step. |
| Conversational agent    | Bounded LangGraph `ToolNode` loop                 | Lets the model select read-only research functions while preserving explicit limits and visible execution.           |
| Tool result strategy    | Compact structured JSON with source IDs           | Keeps tool evidence auditable and protects the local model's 4,096-token context window.                             |
| Tool organization       | Domain category modules plus a shared catalog     | Keeps SEC, market, valuation, and future tool families independently readable and testable.                          |

## Architecture

```text
React + Vite dashboard
        ↓ HTTP / Server-Sent Events
Hono API server
        ↓
LangGraph.js research workflow
        ↓
SEC EDGAR + Massive market data + LLM
```

The frontend owns interaction and visualization. The Hono API server owns secrets and exposes research endpoints. LangGraph.js, data tools, prompts, and shared schemas remain framework-independent TypeScript modules.

## Ollama context and final-chair prompt

The local model context window is controlled through `OLLAMA_NUM_CTX` and defaults to 4096 tokens.
The final chair receives the draft memo, skeptic challenge, compact analyst conclusions, and source
IDs rather than the full SEC and market evidence again. This avoids duplicating context that the
earlier nodes already used while preserving the evidence trail.

## Human approval boundary

The streaming graph interrupts after the skeptic challenge and before final synthesis. The user can
approve, request a revision with feedback, or reject the memo. Approve and revise resume the same
checkpointed run; reject routes directly to the end without publishing a final memo.

The synchronous `/research` endpoint auto-approves for backward compatibility. Human approval is a
feature of the interactive SSE workflow, where a stable run ID is available for resumption. See
[Human approval interrupts](HUMAN_APPROVAL.md) for the detailed contract.

## Conversational tool selection

Focused questions use a separate tool-calling graph instead of changing the committee into an
open-ended loop. The model may choose SEC fundamentals, filing metadata, market snapshot, bounded
price history, or deterministic valuation tools. Runs are capped at four tool calls and stream tool
activity to the browser. See [Conversational tool-calling agent](TOOL_CALLING_AGENT.md).

## Ticker validation and SEC fundamentals

The first graph validates a U.S. ticker using Zod, then performs these deterministic steps before any LLM is introduced:

1. Resolve the ticker to a CIK with the SEC ticker mapping.
2. Fetch the SEC Company Facts JSON for that CIK with an identified server-side user agent.
3. Select complete annual USD revenue, net income, and operating cash flow values.
4. Match facts by reporting-period end date, not only the filing fiscal-year field, because later filings can include comparative periods.
5. Store the normalized data and source URL in LangGraph state for the memo and evidence panel.

## Initial API responsibilities

- Accept a ticker and create a research run.
- Invoke the LangGraph workflow.
- Stream workflow status to the client when needed.
- Return the final memo, evidence, and source list.
- Stream stage and task lifecycle events through `/research/stream`.
- Stream selected structured artifacts without exposing the graph's complete internal state.
- Keep API keys and third-party calls on the server.

## Validation boundaries

Zod schemas will validate:

- User-provided ticker symbols and request payloads.
- SEC EDGAR and market-data responses before they enter graph state.
- Data passed between graph nodes.
- Structured LLM memo output.
- API response contracts.

## Code readability standard

When adding or changing code:

- Prefer small, single-purpose modules and functions with domain-specific names.
- Keep external API parsing and normalization separate from graph orchestration and UI components.
- Use typed schemas at system boundaries instead of unstructured objects.
- Add concise comments only where business rules or non-obvious constraints need explanation.
- Run `pnpm format` before handoff; use `pnpm format:check` in automated checks later.

## Explicitly deferred

These are intentionally out of scope for the first end-to-end milestone:

- Authentication and user accounts.
- Database persistence and a durable LangGraph checkpointer.
- Portfolio tracking and personalized recommendations.
- Real-time market data.
- Peer-comparison data beyond the initial market-data snapshot.
- Background workers and durable database-backed checkpoints.

The demo uses in-memory checkpoints. A production deployment would replace them with a durable
checkpointer so paused runs survive process restarts and can be tied to authenticated users.

## First implementation target

Given `AAPL`, the application produces a concise, source-backed fundamentals memo with visible SEC-derived evidence, clear error handling for invalid tickers, and an educational-not-advice disclaimer.
