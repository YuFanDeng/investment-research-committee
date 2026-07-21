# Investment Research Committee — High-Level Plan

## Project goal

Build a LangGraph-powered research application where a user enters a U.S. stock ticker and receives a source-backed, risk-aware investment research memo. The application is for educational research only and must not provide personalized investment advice.

The agreed initial stack and architecture are recorded in [TECHNICAL_DECISIONS.md](TECHNICAL_DECISIONS.md).

## Current implementation status

The first data-research vertical slice is complete:

- The API validates and normalizes the user-provided ticker with Zod before it enters the workflow.
- LangGraph validates the ticker, resolves it to an SEC CIK, retrieves SEC EDGAR Company Facts, and writes a source-backed fundamentals memo.
- The SEC client selects complete annual revenue, net income, and operating cash flow from a common reporting-period end date. This avoids mistaking comparative figures in a later filing for the current fiscal year.
- Invalid or unrecognized tickers produce a structured workflow error rather than an unsupported memo.

## Phase 1 — Define a tight MVP

Start with one clear input and one useful output.

- **Input:** a stock ticker, for example `NVDA`.
- **Output:** a research memo with a company snapshot, financial highlights, recent catalysts, bull and bear cases, key risks, and a research stance with confidence.

Limit the first version to U.S. equities. A small supported set of tickers is acceptable while data sources are being validated.

## Phase 2 — Build the data layer

Give the workflow bounded, reliable tools for:

- Market data: price history, market capitalization, valuation metrics, and earnings dates.
- SEC EDGAR filings: recent 10-K, 10-Q, and 8-K documents.
- News: recent company news, including source URLs and publication dates.
- Calculations: returns, moving averages, valuation comparisons, and basic ratios.

Store tool responses, source URLs, and timestamps in the graph state so citations and debugging are straightforward.

## Phase 3 — Model the LangGraph workflow

Create a shared `ResearchState` that contains the ticker, evidence, sources, drafts, risks, and approval status.

```text
Validate ticker
    ↓
Run research agents in parallel
    ├── Fundamentals researcher
    ├── SEC filings researcher
    ├── News/catalyst researcher
    └── Market/technical researcher
    ↓
Investment-thesis synthesizer
    ↓
Bear-case critic
    ↓
Risk and citation verifier
    ↓
Human review checkpoint
    ↓
Final memo generator
```

Use LangGraph features that demonstrate agent engineering:

- Parallel fan-out and fan-in research steps.
- Conditional routing for missing or conflicting evidence.
- Retries and fallback sources.
- Checkpointing and resumable runs.
- Human approval before finalizing a memo.

## Phase 4 — Make the agents genuinely distinct

Each agent should have a narrow mandate and structured output, ideally with Pydantic schemas.

| Agent                   | Responsibility                                                                |
| ----------------------- | ----------------------------------------------------------------------------- |
| Fundamentals researcher | Revenue, margins, cash flow, valuation, and peer context.                     |
| Filing analyst          | Material disclosures, guidance, legal items, and company-reported risks.      |
| News analyst            | Recent catalysts, source reliability, and likely positive or negative impact. |
| Technical analyst       | Trend, volatility, drawdown, and key price levels.                            |
| Thesis writer           | A balanced initial interpretation of the collected evidence.                  |
| Bear-case critic        | Counterarguments, weak assumptions, and disconfirming evidence.               |
| Risk verifier           | Missing sources, unsupported claims, and disclaimer/compliance checks.        |

## Phase 5 — Add guardrails and evaluation

- Require citations for factual claims.
- Clearly label model inferences separately from reported facts.
- Flag or reject memos with weak evidence coverage.
- Avoid personalized buy/sell recommendations.
- Test invalid tickers, missing filings, contradictory news, stale data, and prompt injection in retrieved content.
- Capture run metadata such as latency, cost, retries, and failure reason.

Create a small evaluation set of saved research tasks. Measure required-section coverage, citation validity, risk identification, and unsupported-claim rate.

## Phase 6 — Build a simple demo UI

Use React + Vite for a focused interface with:

- Ticker input and a **Run research** action.
- Live workflow status showing the active agent.
- An evidence and sources drawer.
- A final memo view.
- A **Challenge this thesis** action that asks the critic a user-supplied question.
- Human approve/reject controls at the review checkpoint.

## Phase 7 — Package it for interviews

The repository should include:

- An architecture diagram and LangGraph state flow.
- A short explanation of why orchestration is preferable to a single prompt.
- A demo GIF or screenshots.
- An example memo with its citation trail.
- Evaluation results and known limitations.
- Clear setup instructions and environment-variable documentation.

Suggested build order: data tools → one end-to-end graph → structured outputs → critic/verifier → checkpointing → UI → evaluations.

## Interview framing

> I built a stateful, multi-agent equity-research workflow. Specialized agents collect and analyze different evidence; LangGraph coordinates parallel execution, critique, quality gates, and human approval. The final output is auditable because every key factual claim is tied to evidence.
