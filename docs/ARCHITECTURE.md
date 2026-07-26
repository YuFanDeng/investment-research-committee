# Interview Demo Architecture

This diagram shows the path from a ticker search to a source-backed committee memo.

```mermaid
flowchart LR
    User[Investor / interviewer] --> Web[React + Vite dashboard]
    Web -->|POST /research/stream| API[Hono API]
    API --> Graph[LangGraph.js research graph]

    Graph --> Validate[Validate ticker]
    Validate --> SEC[SEC EDGAR adapter]
    Validate --> Massive[Massive market adapter]

    SEC --> Evidence[Shared evidence state]
    Massive --> Evidence
    Evidence --> Analysts[Parallel analyst nodes]

    Analysts --> Fundamentals[Fundamentals analyst]
    Analysts --> Business[Business quality analyst]
    Analysts --> Valuation[Valuation analyst]

    Fundamentals --> Draft[Committee chair draft]
    Business --> Draft
    Valuation --> Draft
    Draft --> Skeptic[Skeptic challenge]
    Skeptic --> Chair[Final chair synthesis]
    Chair --> Memo[Source-backed memo]
    Memo --> API

    Graph -. stage events .-> API
    API -. Server-Sent Events .-> Web
    Web --> Render[Timeline, chart, analyst cards, memo]

    Ollama[(Local Ollama model)] -. structured output .-> Analysts
    Ollama -. chair and skeptic output .-> Draft
    Ollama -. chair and skeptic output .-> Chair
```

## Demo talking points

- The browser owns interaction and presentation; it does not orchestrate agents.
- Hono keeps provider credentials server-side and exposes both synchronous and streaming APIs.
- LangGraph owns shared state, ordering, parallel analyst work, and critique stages.
- SEC EDGAR provides filing evidence and Massive provides normalized market context.
- Ollama is replaceable because model invocation is isolated behind typed graph dependencies.
- Deterministic fallbacks keep the demo inspectable when a local model or provider is unavailable.
