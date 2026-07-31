# Interview Demo Architecture

This diagram shows the two complementary LangGraph workflows behind the dashboard: a predictable
investment committee and a conversational agent that selects read-only research tools.

```mermaid
flowchart TB
    User[Investor / interviewer] --> Web[React + Vite dashboard]
    Web -->|SSE request| API[Hono API]

    subgraph Committee[Deterministic committee workflow]
        direction TB
        ResearchGraph[LangGraph research graph] --> Validate[Validate ticker]
        Validate --> Evidence[Retrieve and normalize evidence]
        Evidence --> Analysts[Parallel specialist analysts]
        Analysts --> Fundamentals[Fundamentals]
        Analysts --> Business[Business quality]
        Analysts --> Valuation[Valuation]
        Fundamentals --> Draft[Committee chair draft]
        Business --> Draft
        Valuation --> Draft
        Draft --> Skeptic[Skeptic challenge]
        Skeptic --> Approval{Human approval interrupt}
        Approval -->|Approve or revise| Final[Final chair synthesis]
        Approval -->|Reject| Rejected[End without publishing]
    end

    subgraph Assistant[Conversational tool-calling workflow]
        direction TB
        AgentGraph[LangGraph assistant graph] --> Model[Ollama chooses a tool or answers]
        Model -->|Validated tool call| ToolNode[Bounded ToolNode loop]
        ToolNode --> Catalog[Categorized tool catalog]
        Catalog --> SecTools[SEC fundamentals and filings]
        Catalog --> MarketTools[Snapshot and price history]
        Catalog --> ValuationTools[Deterministic valuation metrics]
        SecTools --> ToolResult[Compact sourced tool result]
        MarketTools --> ToolResult
        ValuationTools --> ToolResult
        ToolResult -->|ToolMessage| Model
        Model -->|No tool call| Answer[Source-backed answer]
    end

    API -->|POST /research/stream| ResearchGraph
    API -->|POST /assistant/stream| AgentGraph

    SEC[(SEC EDGAR)] --> Evidence
    Massive[(Massive market data)] --> Evidence
    SEC --> SecTools
    Massive --> MarketTools
    SEC --> ValuationTools
    Massive --> ValuationTools
    Ollama[(Local Ollama model)] -. structured generation .-> Analysts
    Ollama -. tool selection and response .-> Model

    Final --> ResearchEvents[Research lifecycle and artifact events]
    ResearchEvents -. SSE .-> API
    Answer -. SSE tool activity and answer .-> API
    API -. incremental UI updates .-> Web
```

## Demo talking points

- The browser owns interaction and presentation; it does not orchestrate agents.
- Hono keeps provider credentials server-side and exposes streaming endpoints for both workflows.
- LangGraph owns shared state, ordering, parallel analyst work, critique, checkpointing, and
  conditional routing after a human decision.
- A separate bounded agent loop chooses read-only tools for focused user questions while the
  committee graph remains deterministic.
- The streaming workflow pauses at a graph boundary. The browser resumes the same run by its
  `thread_id`; it does not restart research or recreate graph state.
- SEC EDGAR provides filing evidence and Massive provides normalized market context.
- Ollama is replaceable because model invocation is isolated behind typed graph dependencies.
- Deterministic fallbacks keep the demo inspectable when a local model or provider is unavailable.
