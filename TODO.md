# Build checklist

This is the current implementation sequence for the first local-model milestone.

- [x] 1. Complete the SEC-backed research vertical slice.
- [x] 2. Add a provider-aware Ollama model factory that reads local model configuration.
- [x] 3. Use Ollama structured output to generate `ResearchMemo` objects.
- [x] 4. Preserve the deterministic memo as a clear Ollama-unavailable fallback.
- [x] 5. Add focused tests for schemas, structured output, and fallback behavior.
- [x] 6. Add GitHub Actions checks for formatting, type checking, and the web build.

After each step, review the technical decision and verify the result before moving on.

## Next milestones

- [x] Run a live end-to-end memo with the configured local Ollama model.
- [ ] Add streaming research status and clearer model/fallback states to the UI.
- [x] Expand the single memo writer into a three-analyst research committee.
- [x] Add a Massive market-price adapter for the valuation analyst.
- [x] Add peer-comparison data for the valuation analyst.
- [x] Compact historical market data into deterministic metrics before LLM prompts.
- [x] Add a dedicated chair challenge pass for skeptic/risk review.
- [ ] Add an architecture diagram, screenshots, evaluation results, and known limitations for the interview demo.

## Multi-agent committee milestone

The first committee iteration will use three specialized analysts who receive the same
source-backed evidence but answer different research questions. Each analyst should return
structured claims, concerns, confidence, and `sourceIdsUsed` so the chair can compare their
work without relying on unstructured prose alone.

### Proposed analysts

1. **Fundamentals analyst**

   Focuses on reported financial performance: revenue, net income, operating cash flow,
   year-over-year direction, and notable changes in the fundamentals snapshot. This is the
   first analyst we can implement using the SEC Company Facts data already in the project.

2. **Business quality analyst**

   Focuses on the durability of the business: operating strengths, concentration risks,
   business-model dependencies, and evidence that could support or weaken the company’s
   competitive position. This will require adding selected 10-K and 10-Q filing sections.

3. **Valuation analyst**

   Focuses on how the current market price compares with business performance: valuation
   multiples, peer context, growth assumptions, and simple bull/base/bear scenarios. This
   requires adding a market-price and peer-data tool before the analyst can be implemented.

### Committee sequence

```text
validated ticker → shared SEC evidence → three analysts in parallel
                                      → chair synthesis (next milestone)
```

The risk-and-skeptic function is intentionally deferred to the chair review phase, where it
can challenge all three analyst reports. Valuation is part of the initial committee roster,
but its implementation depends on adding reliable market-price and peer data.
