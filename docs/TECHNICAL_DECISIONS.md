# Technical Decisions

This document records the initial implementation choices for the Investment Research Committee project.

## Locked-in stack

| Area                    | Decision           | Why                                                                                                                  |
| ----------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Frontend                | React + TypeScript | Matches the team's frontend strengths and supports a polished, interactive research dashboard.                       |
| Build tooling           | Vite               | Fast local development and a lightweight SPA setup. Server-side rendering is not required for the initial dashboard. |
| API server              | Hono + TypeScript  | A small HTTP layer for starting and resuming research runs, streaming progress, and protecting API keys.             |
| Agent orchestration     | LangGraph.js       | Keeps the workflow, graph state, conditional routing, critique, and later human approval in TypeScript.              |
| Runtime validation      | Zod                | Validates untrusted runtime data and infers TypeScript types from the same schemas.                                  |
| Primary evidence source | SEC EDGAR          | Provides authoritative U.S. company filing and financial data.                                                       |
| Code formatting         | Prettier           | Keeps source files consistently readable and reduces formatting noise in reviews.                                    |

## Architecture

```text
React + Vite dashboard
        ↓ HTTP / Server-Sent Events
Hono API server
        ↓
LangGraph.js research workflow
        ↓
SEC EDGAR + market-data providers + LLM
```

The frontend owns interaction and visualization. The Hono API server owns secrets and exposes research endpoints. LangGraph.js, data tools, prompts, and shared schemas remain framework-independent TypeScript modules.

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
- A multi-agent committee, human-approval interrupts, and background workers.

We will add persistence when the single research workflow works reliably, then add specialist agents and a human review checkpoint.

## First implementation target

Given `AAPL`, the application produces a concise, source-backed fundamentals memo with visible SEC-derived evidence, clear error handling for invalid tickers, and an educational-not-advice disclaimer.
