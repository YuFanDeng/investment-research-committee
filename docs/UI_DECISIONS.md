# UI and Visualization Decisions

This document records the design decisions for the research workspace redesign.

## Goals

- Make the Massive market-price data visible at the top of a completed research run.
- Make LangGraph's streamed node lifecycle easy to scan while a run is active.
- Preserve a report-like reading experience for the final memo and analyst findings.
- Keep the UI componentized and readable without hiding the design system inside a large component library.

## Locked decisions

| Area                   | Decision                                                                    | Rationale                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Visual direction       | Institutional dashboard shell with a research-report reading surface        | Balances data density with a clear narrative for interview demos.                                                                        |
| Workflow visualization | Custom node-level timeline grouped into four named phases                  | Users can immediately see what is active, complete, or waiting without learning a graph diagram.                                         |
| Price visualization    | Recharts line chart using the historical closes already returned by Massive | Shows real market context without inventing data or adding a second market-data request.                                                 |
| Icons                  | `lucide-react`                                                              | Consistent, accessible SVG icons for status, evidence, market, and analyst cards.                                                        |
| Styling                | Existing CSS variables and component classes                                | Keeps visual decisions explicit and avoids a migration to a utility framework for this milestone.                                        |
| Component library      | No full UI kit yet                                                          | The project benefits more from domain-specific components than generic prebuilt cards and layouts.                                       |
| Graph library          | No React Flow-style graph yet                                               | The workflow is best understood as a timeline in the primary user experience; the architecture diagram remains a documentation artifact. |

## Component model

```text
ResearchWorkspace
├── ResearchHeader
├── ResearchSummary
│   ├── PriceMetric
│   ├── ReturnMetric
│   └── MarketCapMetric
├── ResearchTimeline
├── MarketSnapshotPanel
│   ├── PriceChart
│   └── PeerComparison
├── ResearchMemo
├── CommitteePanel
├── SkepticPanel
└── EvidencePanel
```

## Interaction and accessibility

- The active streamed stage is announced through the existing `role="status"` message.
- Timeline stages use text labels in addition to icons and color, so status is not color-only.
- Chart tooltips expose the date and price for each historical point.
- Motion is limited to small status transitions and respects `prefers-reduced-motion`.
- Fixture/live SEC mode remains available only in development and is visually secondary to the research action.

## Scope boundary

The first chart is a compact historical-close view, not a trading terminal. Real-time quotes,
interactive range selection, portfolio tracking, and a full node graph remain future work.
