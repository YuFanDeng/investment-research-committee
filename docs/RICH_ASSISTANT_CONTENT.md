# Rich Assistant Content

## Decision

Agent Chat responses use a versioned collection of typed content blocks. The model still writes a
short Markdown interpretation, while deterministic TypeScript turns validated tool data into
charts, metrics, and tables. The model never generates React code or arbitrary component props.

```text
Provider response
      ↓
Research tool ── compact JSON ──→ Ollama
      │
      └── full typed artifact ──→ content-block collector
                                      ↓
                              versioned SSE envelope
                                      ↓
                              React block registry
```

This side channel is important for the local 4,096-token context window. A price chart can retain
every daily close for React while Ollama receives only a 12-point sample and calculated summary.

## Version 1 block contract

The shared Zod contract lives in `packages/research/src/assistant/content-blocks.ts` and is exported
through `@investment-research/research/assistant-content`.

| Block type    | Current producer                  | React presentation                  |
| ------------- | --------------------------------- | ----------------------------------- |
| `markdown`    | Final model answer                | GitHub-flavored Markdown            |
| `line-chart`  | Price history and moving averages | Recharts multi-series line chart    |
| `bar-chart`   | Quarterly SEC fundamentals        | Recharts quarterly revenue bars     |
| `metric-grid` | Insider transaction summary       | Four compact summary metrics        |
| `data-table`  | Insider transaction details       | Expandable, horizontally safe table |

Every non-Markdown block has a stable ID, title, optional description, and source IDs. Chart and
table values are restricted to JSON primitives. The API validates the complete envelope before it
crosses the SSE boundary.

## Deterministic producers

- `get_price_history` collects a line chart containing the complete adjusted daily-close series.
  Its compact tool result sent to the model remains unchanged.
- `calculate_moving_averages` calculates rolling series in TypeScript and merges them into the
  ticker's existing price chart by stable block ID. It works whether price history or moving
  averages run first.
- Quarterly `get_sec_fundamentals` creates a revenue bar chart using normalized reported and
  derived quarters. Derivation metadata stays attached to each datum.
- `get_insider_transactions` creates summary metrics over every match in the bounded scan and an
  expandable table containing the bounded detailed records and their SEC source IDs.

## React rendering

`AssistantContent` validates each block independently and dispatches known types through a small
component registry. This keeps the chat panel independent from visualization details. A newer or
malformed block does not break the response: the UI renders it as expandable formatted JSON.

Markdown is rendered with `react-markdown` and `remark-gfm`. Raw HTML is not enabled. Known source
tokens become labeled external links, while the existing source chips remain available below the
response.

## Adding another block

1. Add the block's Zod schema to the shared discriminated union.
2. Build the block deterministically from normalized tool data.
3. Add a focused React renderer and register its `type` in `AssistantContent`.
4. Add contract, producer, and rendering tests appropriate to the new block.
5. Increment the envelope version only for a breaking contract change.
