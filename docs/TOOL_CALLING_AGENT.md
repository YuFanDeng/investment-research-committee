# Conversational Tool-Calling Agent

## Decision

Add a conversational research agent alongside the existing investment committee graph. The agent
answers focused ticker questions by choosing from a small set of read-only tools. It does not
replace the deterministic committee workflow.

This gives the product two complementary modes:

- **Committee research** runs a known sequence of specialist agents, critique, and human approval.
- **Ask research** lets the model decide which evidence is necessary for a focused question.

The assistant is available through a dedicated **Agent chat** mode beside **Committee research**.
The user mentions a company naturally in the question instead of configuring a ticker first. The
model resolves the likely U.S. ticker as a validated tool argument, and the UI displays that choice.
Switching modes preserves both the conversation and committee state.

## Initial tool catalog

| Tool                          | Responsibility                                                               |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `get_sec_fundamentals`        | Retrieve normalized annual SEC revenue, net income, and operating cash flow. |
| `get_recent_filings`          | Find recent 10-K, 10-Q, or 8-K filing metadata and source links.             |
| `get_market_snapshot`         | Retrieve the latest end-of-day price, market cap, and related companies.     |
| `get_price_history`           | Summarize a bounded 30, 90, or 365-day price range.                          |
| `calculate_valuation_metrics` | Calculate earnings and cash-flow multiples deterministically.                |
| `calculate_moving_averages`   | Calculate common simple moving averages from adjusted daily closes.          |

Every company-data tool requires a Zod-validated ticker argument. Tools return compact JSON with
source IDs. The model resolves the company, chooses tools, and explains results, while TypeScript
validates inputs and performs data retrieval and calculations. An ambiguous company should produce
a clarification question rather than a guessed tool call.

## Tool organization

Tool implementations are grouped by research domain so the catalog can grow without becoming a
single large module:

```text
assistant/tools/
├── catalog.ts    # Combines the category tool lists
├── context.ts    # Per-run clients, request cache, and source collection
├── sec.ts        # SEC fundamentals and filing tools
├── market.ts     # Market snapshot and price-history tools
├── technical.ts  # Deterministic technical-indicator tools
└── valuation.ts  # Deterministic valuation tools
```

A future category, such as news or insider activity, should add its own module and register its tool
list in `catalog.ts`. Cross-category request caching and source tracking stay in `context.ts`.

## Graph shape

```text
User conversation
       ↓
Tool-selection model
       ↓
Did the model request tools?
  ├── yes → execute tools → model
  ├── over limit → answer from collected evidence
  └── no → final answer
```

LangGraph's `ToolNode` executes requested tools. The API translates graph updates into SSE events so
the UI can show which tool was requested and when it completed.

## Guardrails

- Tools are read-only and have Zod-validated inputs.
- Tickers inferred by the model are normalized and validated at every tool boundary.
- Conversation history is limited to six messages.
- Questions are limited to 1,000 characters.
- One run can execute at most four tool calls.
- Price ranges are restricted to 30, 90, or 365 days.
- Moving-average periods accept one to six integer values from 2 through 250 trading sessions;
  common defaults are 20, 50, and 200.
- Price history is summarized before reaching the model to protect the 4,096-token context window.
- Financial ratios and technical indicators are calculated from retrieved values, never by model
  arithmetic.
- Every external result retains source IDs, URLs, and retrieval timestamps.
- The answer must distinguish reported facts from inference and must not give personalized advice.

## Failure behavior

A provider or tool error becomes a tool result that the model can acknowledge. If Ollama itself is
unavailable or the selected model cannot call tools, the request fails visibly rather than silently
pretending that an autonomous tool decision occurred.

## Known limitations

- Tool selection quality depends on the installed Ollama model's native tool-calling ability.
- The agent has short-term request history only; conversations are not persisted.
- The in-memory execution is suitable for a local interview demo, not a multi-instance deployment.
- Valuation metrics use annual SEC facts and end-of-day market capitalization; they are educational
  screening ratios, not a full valuation model.
- Moving averages use historical daily closes and describe price position, not a trading signal.
