# Investment Research Committee

A source-backed, educational equity-research workflow built with React, Vite, Hono, LangGraph.js, and Zod.

## Current milestone

The project provides a complete multi-agent research demo:

1. Enter a U.S. ticker in the React dashboard.
2. Stream LangGraph node progress through the Hono API with Server-Sent Events.
3. Retrieve SEC EDGAR fundamentals and Massive end-of-day market context.
4. Run fundamentals, business quality, and valuation analysts with a chair draft and skeptic challenge.
5. Pause after the skeptic challenge for a human approve, revise, or reject decision.
6. Display a historical price chart, analyst reports, source trail, and approved final memo.
7. Ask naturally in a dedicated agent-chat mode where the model resolves the ticker and selects SEC, market, or valuation tools.

Local Ollama generation is optional; deterministic fallbacks keep the workflow usable when the model is unavailable.

## Architecture

```mermaid
flowchart TB
    User[Investor / interviewer] --> Web[React + Vite dashboard]
    Web --> CommitteeUI[Committee research mode]
    Web --> AgentUI[Agent chat mode]
    CommitteeUI -->|SSE request| API[Hono API]
    AgentUI -->|SSE request| API

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
        AgentGraph[LangGraph assistant graph] --> Model[Ollama resolves ticker and chooses a tool]
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
    API -. lifecycle and artifact updates .-> CommitteeUI
    API -. tool activity and answers .-> AgentUI
```

See [Interview Demo Architecture](docs/ARCHITECTURE.md) for the accompanying design notes and interview talking points.

## Prerequisites

- Node.js 22 or later
- pnpm 10 or later

## Run locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173`. The API runs at `http://localhost:8787`.

The root `.env` contains local API and Vite configuration and is ignored by Git. Copy `.env.example` when configuring a new environment; keep the real Massive key in this root file only.

In development, the UI includes a SEC source toggle. Choose the AAPL fixture for fast
iteration or Live SEC for a real request. Production builds expose only the live mode.

## Checks

```bash
pnpm check
pnpm build
```

## Formatting

```bash
pnpm format        # Format all supported files
pnpm format:check  # Verify formatting without changing files
```

## Documentation

- [Project plan](docs/PROJECT_PLAN.md)
- [Technical decisions](docs/TECHNICAL_DECISIONS.md)
- [UI decisions](docs/UI_DECISIONS.md)
- [Streaming design](docs/STREAMING.md)
- [Human approval interrupts](docs/HUMAN_APPROVAL.md)
- [Conversational tool-calling agent](docs/TOOL_CALLING_AGENT.md)
- [Market-data provider](docs/MARKET_DATA_PROVIDER.md)
- [Testing strategy](docs/TESTING.md)
- [Interview architecture](docs/ARCHITECTURE.md)
