# Testing and Development Data Strategy

## Decision

Development can choose between a real SEC EDGAR request and a checked-in AAPL Company Facts
fixture. The choice is made per research request from a development-only UI toggle.

Massive market data remains live in both modes. This lets us iterate quickly on SEC-driven
workflow changes while preserving real prices, history, and peer comparisons for the valuation
analyst.

The conversational agent reuses the same per-request SEC mode. Tool tests use injected clients and
assert deterministic calculations, compact price-history output, source collection, and filing
metadata without calling external services or Ollama.

Quarterly fundamentals tests use synthetic Company Facts periods to verify that standalone quarters
are separated from cumulative 10-Q facts, later comparative duplicates do not replace the original
fiscal identity, Q4 is derived from annual minus nine-month revenue, and QoQ/YoY comparisons are
calculated before the requested period limit is applied. The AAPL fixture also exercises the same
quarterly selector used by the live client.

Moving-average tests use synthetic, intentionally unsorted closes to verify chronological sorting,
exact SMA values, above/below classification, insufficient-history behavior, supported-period
validation, custom 120-session requests, duplicate normalization, and reuse of cached 365-day
Massive history across tools.

Close-only indicator tests verify SMA-seeded EMA series, Wilder RSI smoothing and zero-gain/loss
edge cases, MACD line/signal/histogram calculations, population-standard-deviation Bollinger Bands,
insufficient-history results, and typed chart artifact creation.

Form 4 adapter tests verify all documented provider query parameters, response normalization,
three-state plan and ownership disclosures, source creation, and missing-field behavior. Injected
tool tests verify semantic filtering, deterministic summaries, compact execution context, and source
collection without calling Massive or Ollama.

Conversation-history tests verify that long model answers are accepted at the API boundary, then
compacted to per-message and total character budgets before the next Ollama invocation. Compaction
preserves the beginning and conclusion of a long answer and prioritizes recent messages.

## Fixture

The fixture is the raw SEC Company Facts response captured for Apple:

```text
packages/research/src/fixtures/sec/companyfacts/AAPL.json
```

The fixture client parses that response through the same annual and quarterly
fundamentals-selection logic used by the live SEC client. It is labeled as a fixture source and
records its capture timestamp in the graph source metadata.

The first fixture supports `AAPL` only. Other tickers must use Live SEC mode.

## How to use it

Start the normal development server:

```sh
pnpm dev
```

In development, the research form shows:

- **Fixture (AAPL):** fast, deterministic SEC data.
- **Live SEC:** the actual SEC EDGAR request.

Massive market data and local Ollama behavior are unchanged by this toggle.

## Production guardrail

The API rejects `secDataMode: "fixture"` when `NODE_ENV=production`. The toggle is also
omitted from production UI builds, so fixture data cannot be selected accidentally in a
deployed environment.

## Testing boundaries

- Fixture mode is used for fast UI and graph iteration.
- Live SEC mode is used for integration checks and validating ticker behavior.
- Massive has its own adapter tests with mocked HTTP responses, plus live checks when a local
  API key is available.
- The fixture is not a substitute for periodically refreshing live-data integration tests.
