# Technical Decisions

This document records the initial implementation choices for the Investment Research Committee project.

## Locked-in stack

| Area                    | Decision                                           | Why                                                                                                                  |
| ----------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Frontend                | React + TypeScript                                 | Matches the team's frontend strengths and supports a polished, interactive research dashboard.                       |
| Build tooling           | Vite                                               | Fast local development and a lightweight SPA setup. Server-side rendering is not required for the initial dashboard. |
| API server              | Hono + TypeScript                                  | A small HTTP layer for starting and resuming research runs, streaming progress, and protecting API keys.             |
| Agent orchestration     | LangGraph.js                                       | Keeps the workflow, graph state, conditional routing, critique, and later human approval in TypeScript.              |
| Runtime validation      | Zod                                                | Validates untrusted runtime data and infers TypeScript types from the same schemas.                                  |
| Primary evidence source | SEC EDGAR                                          | Provides authoritative U.S. company filing and financial data.                                                       |
| Market data provider    | Massive                                            | Documented TypeScript-friendly API with a free end-of-day tier suitable for the valuation analyst demo.              |
| Code formatting         | Prettier                                           | Keeps source files consistently readable and reduces formatting noise in reviews.                                    |
| Progress transport      | Server-Sent Events                                 | Streams one LangGraph run to the React UI without making the browser orchestrate internal agents.                    |
| Partial-result delivery | Typed SSE artifact events                          | Reveals SEC, market, analyst, and skeptic results as nodes finish while preserving one authoritative final response. |
| UI icons                | lucide-react                                       | Provides a consistent, lightweight icon vocabulary for workflow, evidence, and market states.                        |
| Price chart             | Recharts                                           | Renders the historical closes already returned by Massive without introducing a second charting abstraction.         |
| UI component strategy   | Domain components + CSS tokens                     | Keeps the dashboard visually distinctive and makes the frontend architecture easy to understand and maintain.        |
| Ollama context window   | Configurable via `OLLAMA_NUM_CTX`, default `4096`  | Keeps local development compatible with the current model while allowing larger-context models later.                |
| Human review            | LangGraph interrupt after skeptic challenge        | Demonstrates checkpointed pause/resume, explicit user control, and conditional graph routing before publication.     |
| Demo checkpointing      | LangGraph `MemorySaver`                            | Preserves paused runs by `thread_id` without adding a database; durable persistence remains a later production step. |
| Conversational agent    | Bounded LangGraph `ToolNode` loop                  | Lets the model select read-only research functions while preserving explicit limits and visible execution.           |
| Tool result strategy    | Compact structured JSON with source IDs            | Keeps tool evidence auditable and protects the local model's 4,096-token context window.                             |
| Tool organization       | Domain category modules plus a shared catalog      | Keeps SEC, market, valuation, and future tool families independently readable and testable.                          |
| Technical indicators    | Pure TypeScript calculations over Massive closes   | Keeps arithmetic deterministic, testable, compact, and independent from model reasoning.                             |
| Quarterly fundamentals  | Extend `get_sec_fundamentals` with a period option | Keeps the agent's tool catalog small while annual and quarterly SEC normalization remain separate internally.        |
| Insider transactions    | Dedicated ownership tool backed by Massive Form 4  | Exposes rich ownership filters while keeping classification, summaries, and disclosure semantics deterministic.      |

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
price history, deterministic valuation, or moving-average tools. Runs are capped at four tool calls
and stream tool activity to the browser. See
[Conversational tool-calling agent](TOOL_CALLING_AGENT.md).

The React application presents the committee and assistant as separate top-level modes. Both mode
trees remain mounted and the inactive tree uses the HTML `hidden` state, preserving local hook state
when the user switches modes. Committee mode keeps its explicit ticker input. Agent mode has no
ticker input: the model infers a ticker from natural language and supplies it as a required,
Zod-validated argument to each company-data tool. This keeps provider calls deterministic and makes
the model's company resolution visible through a `ticker.resolved` stream event.

The SEC fundamentals tool defaults to the existing annual snapshot and accepts
`period: "quarterly"` for a 1–12-quarter revenue series. Quarterly normalization is implemented in
a separate pure TypeScript module: it filters cumulative 10-Q facts, prefers filings reported near
the original period, derives missing Q4 revenue from the annual and nine-month totals, and computes
QoQ and YoY changes. The result tells the model whether each quarter was reported or derived.

Form 4 research uses a separate ownership tool rather than expanding the market snapshot. The
provider adapter supports every documented Massive query parameter, while the agent receives
bounded domain controls for dates, codes, amendments, reporting owners, direct or indirect
ownership, Rule 10b5-1 status, security type, insider role, and sorting. TypeScript classifies and
summarizes the returned records; Ollama explains that normalized evidence. See
[Insider transactions tool](INSIDER_TRANSACTIONS.md).

## Technical indicators

The first technical-analysis tool calculates simple moving averages for any integer period from 2
through 250 trading sessions. The common 5, 10, 20, 50, 100, and 200-session periods remain
discoverable defaults rather than a restrictive allowlist. A pure calculation module sorts adjusted
daily closes, normalizes duplicate periods, uses the latest `N` observations, and reports the latest
price's distance and position relative to each average. The assistant context caches 365-day history
so price-performance and moving-average tools can reuse one Massive request. See
[Technical analysis tools](TECHNICAL_ANALYSIS.md).

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
