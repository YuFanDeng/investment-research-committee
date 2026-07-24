# Testing and Development Data Strategy

## Decision

Development can choose between a real SEC EDGAR request and a checked-in AAPL Company Facts
fixture. The choice is made per research request from a development-only UI toggle.

Massive market data remains live in both modes. This lets us iterate quickly on SEC-driven
workflow changes while preserving real prices, history, and peer comparisons for the valuation
analyst.

## Fixture

The fixture is the raw SEC Company Facts response captured for Apple:

```text
packages/research/src/fixtures/sec/companyfacts/AAPL.json
```

The fixture client parses that response through the same fundamentals-selection logic used by
the live SEC client. It is labeled as a fixture source and records its capture timestamp in
the graph source metadata.

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
