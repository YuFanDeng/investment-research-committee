# Investment Research Committee

A source-backed, educational equity-research workflow built with React, Vite, Hono, LangGraph.js, and Zod.

## Current milestone

The project provides a complete multi-agent research demo:

1. Enter a U.S. ticker in the React dashboard.
2. Stream LangGraph node progress through the Hono API with Server-Sent Events.
3. Retrieve SEC EDGAR fundamentals and Massive end-of-day market context.
4. Run fundamentals, business quality, and valuation analysts with a chair draft and skeptic challenge.
5. Display a historical price chart, analyst reports, source trail, and final memo.

Local Ollama generation is optional; deterministic fallbacks keep the workflow usable when the model is unavailable.

## Architecture

```mermaid
flowchart TB
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

    Graph -. lifecycle and artifact events .-> API
    API -. Server-Sent Events .-> Web
    Web --> Render[Timeline, chart, analyst cards, memo]

    Ollama[(Local Ollama model)] -. structured output .-> Analysts
    Ollama -. chair and skeptic output .-> Draft
    Ollama -. chair and skeptic output .-> Chair
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
- [Market-data provider](docs/MARKET_DATA_PROVIDER.md)
- [Testing strategy](docs/TESTING.md)
- [Interview architecture](docs/ARCHITECTURE.md)
