# Investment Research Committee

A source-backed, educational equity-research workflow built with React, Vite, Hono, LangGraph.js, and Zod.

## Current milestone

The scaffold provides a complete fundamentals-research vertical slice:

1. Enter a U.S. ticker in the React dashboard.
2. Send it to the Hono API.
3. Resolve the company CIK and retrieve annual fundamentals from SEC EDGAR.
4. Display a structured research memo and source trail.

Local Ollama memo generation is the next integration.

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
