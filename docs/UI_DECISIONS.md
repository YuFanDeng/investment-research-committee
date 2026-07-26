# UI and Visualization Decisions

This document records the design decisions for the research workspace redesign.

## Goals

- Make the Massive market-price data visible at the top of a completed research run.
- Make LangGraph's streamed node lifecycle easy to scan while a run is active.
- Reveal validated research artifacts as soon as their graph nodes complete.
- Preserve a report-like reading experience for the final memo and analyst findings.
- Keep the UI componentized and readable without hiding the design system inside a large component library.

## Locked decisions

| Area                   | Decision                                                                    | Rationale                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Visual direction       | Light modern research workspace with elevated white cards                   | Keeps dense financial information approachable while preserving a polished interview-demo surface.                                       |
| Workflow visualization | Sticky vertical node timeline grouped into four named phases                | Nine stages remain readable without competing for horizontal space, and the active stage stays visible while results stream in.          |
| Price visualization    | Recharts line chart using the historical closes already returned by Massive | Shows real market context without inventing data or adding a second market-data request.                                                 |
| Icons                  | `lucide-react`                                                              | Consistent, accessible SVG icons for status, evidence, market, and analyst cards.                                                        |
| Styling                | Existing CSS variables and component classes                                | Keeps visual decisions explicit and avoids a migration to a utility framework for this milestone.                                        |
| Component library      | No full UI kit yet                                                          | The project benefits more from domain-specific components than generic prebuilt cards and layouts.                                       |
| Graph library          | No React Flow-style graph yet                                               | The workflow is best understood as a timeline in the primary user experience; the architecture diagram remains a documentation artifact. |

## Component model

```text
ResearchWorkspace
├── CompanyHeader
│   ├── PriceMetric
│   ├── ReturnMetric
│   └── MarketCapMetric
├── ResearchToolbar
├── SectionNavigation
└── WorkspaceGrid
    ├── VerticalResearchTimeline
    └── ProgressiveResults
        ├── MarketSnapshotPanel
        │   ├── PriceChart
        │   └── PeerComparison
        ├── FundamentalsSnapshotPanel
        ├── CommitteePanel
        ├── ResearchMemo
        ├── EvidencePanel
        └── SkepticPanel
```

## Interaction and accessibility

- The active streamed stage is announced through the existing `role="status"` message.
- Dashboard slots remain mounted during a run and transition from waiting to active to real data.
- The chair draft is acknowledged but remains hidden until skeptic review and final synthesis finish.
- Timeline stages use text labels in addition to icons and color, so status is not color-only.
- Completed research replaces the landing hero with a compact company and market summary.
- Analyst evidence and skeptic findings are expandable to reduce visual density.
- Section links provide direct navigation to market, fundamentals, committee, memo, and sources.
- Chart tooltips expose the date and price for each historical point.
- Motion is limited to small status transitions and respects `prefers-reduced-motion`.
- Fixture/live SEC mode remains available only in development and is visually secondary to the research action.

## Scope boundary

The first chart is a compact historical-close view, not a trading terminal. Real-time quotes,
interactive range selection, portfolio tracking, and a full node graph remain future work.
