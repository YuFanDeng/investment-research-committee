# System Architecture

The dashboard exposes two complementary LangGraph architectures. They share the React, Hono,
Ollama, SEC, Massive, and SSE boundaries, but they solve different interaction problems and are
therefore documented separately.

## Committee research workflow

This graph favors predictable orchestration, progressive artifacts, and a human decision before
publication.

```mermaid
flowchart TB
    User[Investor] --> UI[Committee research UI]
    UI -->|POST /research/stream| API[Hono API]
    API --> Graph[LangGraph committee graph]
    Graph --> Validate[Validate ticker]
    Validate --> Evidence[Retrieve and normalize evidence]
    SEC[(SEC EDGAR)] --> Evidence
    Massive[(Massive market data)] --> Evidence
    Evidence --> Analysts[Parallel specialist analysts]
    Ollama[(Local Ollama)] -. structured generation .-> Analysts
    Analysts --> Fundamentals[Fundamentals]
    Analysts --> Business[Business quality]
    Analysts --> Valuation[Valuation]
    Fundamentals --> Draft[Chair draft]
    Business --> Draft
    Valuation --> Draft
    Draft --> Skeptic[Skeptic challenge]
    Skeptic --> Approval{Human approval interrupt}
    Approval -->|Approve or revise| Final[Final synthesis]
    Approval -->|Reject| Rejected[End without publishing]
    Final --> Events[Lifecycle and artifact events]
    Events -. SSE .-> UI
```

## Agent chat workflow

This graph favors model-directed tool selection for focused questions while keeping the available
actions validated, read-only, and bounded.

```mermaid
flowchart TB
    User[Investor] --> UI[Agent Chat UI]
    UI -->|POST /assistant/stream| API[Hono API]
    API --> Graph[LangGraph assistant graph]
    Graph --> Model[Ollama resolves company and chooses a tool]
    Model -->|Validated tool call| ToolNode[Bounded ToolNode loop]
    ToolNode --> Catalog[Categorized tool catalog]
    Catalog --> SECtools[SEC fundamentals and filings]
    Catalog --> MarketTools[Market snapshot and history]
    Catalog --> ValuationTools[Valuation metrics]
    Catalog --> TechnicalTools[Moving averages]
    Catalog --> OwnershipTools[Form 4 insider transactions]
    SEC[(SEC EDGAR)] --> SECtools
    Massive[(Massive market data)] --> MarketTools
    SEC --> ValuationTools
    Massive --> ValuationTools
    Massive --> TechnicalTools
    Massive --> OwnershipTools
    SECtools --> Result[Compact sourced result]
    MarketTools --> Result
    ValuationTools --> Result
    TechnicalTools --> Result
    OwnershipTools --> Result
    Result -->|ToolMessage| Model
    Model -->|No tool call| Answer[Source-backed answer]
    Catalog --> Artifacts[Typed content-block collector]
    Artifacts --> Envelope[Versioned presentation envelope]
    Answer --> Envelope
    Envelope -. SSE .-> Registry[React content registry]
    Registry --> UI
```

## Demo talking points

- The browser owns interaction and presentation; it does not orchestrate agents.
- Hono keeps provider credentials server-side and exposes streaming endpoints for both workflows.
- LangGraph owns shared state, ordering, parallel analyst work, critique, checkpointing, and
  conditional routing after a human decision.
- A separate bounded agent loop chooses read-only tools for focused user questions while the
  committee graph remains deterministic.
- Rich tool data takes a typed presentation side channel to React, so charts and tables do not
  consume Ollama's limited context window. The model receives only compact tool summaries.
- The streaming workflow pauses at a graph boundary. The browser resumes the same run by its
  `thread_id`; it does not restart research or recreate graph state.
- SEC EDGAR provides filing evidence; Massive provides normalized market and Form 4 ownership
  context with direct links back to the original SEC filings.
- Ollama is replaceable because model invocation is isolated behind typed graph dependencies.
- Deterministic fallbacks keep the demo inspectable when a local model or provider is unavailable.
