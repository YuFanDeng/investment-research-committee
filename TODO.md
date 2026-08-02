# Project checklist

The first product milestone is complete: a source-backed, multi-agent equity research workflow
with local-model fallbacks, Massive market data, and live LangGraph progress in a React dashboard.

## Completed

- [x] Build the SEC-backed research vertical slice with ticker validation and normalized fundamentals.
- [x] Add fixture SEC Company Facts data and a development-only live/fixture toggle.
- [x] Add the Ollama model factory, structured outputs, and deterministic fallbacks.
- [x] Expand the workflow into fundamentals, business quality, and valuation analysts.
- [x] Add the committee chair draft, skeptic challenge, and final synthesis stages.
- [x] Add Massive market-price, historical-close, market-cap, and peer data.
- [x] Compact market history before sending evidence to analyst prompts.
- [x] Add synchronous and Server-Sent Events research endpoints.
- [x] Add a visual node-level streaming timeline to the React UI.
- [x] Stream and render partial SEC, market, analyst, and skeptic artifacts as nodes finish.
- [x] Add a market snapshot with historical price chart and peer comparison.
- [x] Redesign the dashboard as a light workspace with a vertical workflow rail.
- [x] Add technical decision, testing, streaming, market-data, UI, and architecture documentation.
- [x] Add a checkpointed human approval interrupt before final chair synthesis.
- [x] Add a bounded conversational agent with visible read-only tool calls.
- [x] Add deterministic 2–250-session moving averages with common 5, 10, 20, 50, 100, and 200 defaults.
- [x] Extend SEC fundamentals with normalized quarterly revenue, QoQ/YoY changes, and transparent Q4 derivation.
- [x] Add formatting, type checking, tests, and production build checks.

## Next milestones

- [ ] Add screenshot examples and a short evaluation report for the project overview.
- [ ] Add stronger analyst evaluation fixtures and regression tests for memo quality.
- [ ] Add durable run history with a database and LangGraph checkpointer.
- [ ] Add EMA, crossover, and chart-overlay technical analysis after the SMA tool is evaluated.
- [ ] Add richer market-data ranges and explicit valuation multiples when the provider supports them.
- [ ] Add authentication and portfolio features only if the product scope expands beyond the demo.

## Known limitations

- Ollama must be running locally for model-generated reports; deterministic facts remain available as a fallback.
- Market data is normalized end-of-day context, not real-time trading data.
- SEC fixture mode is intended for local development and currently uses the captured AAPL response.
- The UI timeline reports node lifecycle events, not token-by-token model output.
