# Product Prompt Guide

These prompts provide a repeatable walkthrough of the application's two research modes. They use
widely recognized companies so the questions are easy to understand without additional company
context.

Live results depend on the latest SEC and Massive data. Treat the expected behavior below as a UI
and workflow contract, not a promise that a particular financial conclusion will remain true.

## Recommended walkthrough

### 1. Run the research committee

Use **Committee research** with:

```text
AAPL
```

What this demonstrates:

- A deterministic LangGraph workflow rather than open-ended tool selection.
- SEC and Massive evidence retrieval.
- Parallel fundamentals, business-quality, and valuation analysts.
- Chair synthesis, skeptic challenge, and a human approval interrupt.
- Progressive Server-Sent Events updates and source-backed artifacts.

At the approval checkpoint, choose **Request revision** and enter:

```text
Make the valuation limitations more prominent and distinguish reported facts from assumptions.
```

This shows that the same checkpointed run resumes with human feedback instead of restarting the
workflow.

### 2. Show quarterly SEC fundamentals

Use **Agent chat**:

```text
How has Microsoft's quarterly revenue changed over the past two years?
```

Expected behavior:

- Resolve Microsoft to `MSFT`.
- Call `get_sec_fundamentals` with `period: "quarterly"` and eight periods.
- Render a quarterly revenue bar chart from normalized SEC facts.
- Preserve quarter-derivation metadata so the response can distinguish derived fourth-quarter
  values from directly reported quarters.

### 3. Show price and technical analysis together

```text
Show Nvidia's one-year price trend with its 20-day, 50-day, and 200-day moving averages. Is the latest close above or below each average?
```

Expected behavior:

- Resolve Nvidia to `NVDA`.
- Retrieve adjusted daily closes through Massive.
- Calculate the moving averages deterministically in TypeScript.
- Render one price chart with all three moving-average overlays.
- Keep the complete chart series out of Ollama's context window.

### 4. Show insider-transaction research

```text
Summarize Apple's reported insider transactions over the past year. Separate open-market trades from compensation activity, and explain any disclosed Rule 10b5-1 or indirect-ownership context.
```

Expected behavior:

- Resolve Apple to `AAPL`.
- Make one broad `get_insider_transactions` call rather than separate calls per category.
- Render summary metrics and an expandable transaction table.
- Preserve the difference between purchases, sales, grants, exercises, withholding, and gifts.
- Treat plan status and ownership type as reported context, not evidence of motivation.

### 5. Show bounded multi-tool reasoning

```text
For Microsoft, summarize the latest annual fundamentals, the one-year stock performance, and whether the latest price is above its 200-day moving average. What are the main limitations of this comparison?
```

Expected behavior:

- Coordinate SEC fundamentals, price history, and moving-average tools within the four-call limit.
- Reuse cached market history instead of requesting the same 365-day series twice.
- Combine a concise narrative with a price-and-moving-average chart.
- Separate retrieved evidence from interpretation.

## Additional focused prompts

### Recent SEC filings

```text
What are Tesla's most recent 10-K, 10-Q, and 8-K filings? Link me to the original SEC sources.
```

Demonstrates filing-type filters and direct source links.

### Valuation calculations

```text
Using the available SEC and market data, calculate Apple's earnings and operating-cash-flow valuation multiples. Explain what these simplified multiples leave out.
```

Demonstrates that TypeScript performs arithmetic while the model explains the result and its
limitations.

### Custom moving average

```text
Calculate Amazon's 120-day moving average and compare it with the latest closing price.
```

Demonstrates that moving-average periods are validated integers from 2 through 250 rather than a
fixed list of common periods.

### Direct versus indirect ownership

```text
Were Microsoft's recent reported insider sales held directly or indirectly, and were any marked as Rule 10b5-1 transactions?
```

Demonstrates ownership and plan-status fields without inferring why an insider sold.

## Conversation behavior prompts

### Ambiguous company

```text
How is United doing financially?
```

Expected behavior: ask whether the user means United Airlines, UnitedHealth, or another company
instead of guessing a ticker.

### Follow-up context

First ask:

```text
How has Apple's quarterly revenue changed over the past year?
```

Then ask:

```text
How did its stock perform over that same period?
```

Expected behavior: reuse Apple as the established company while choosing a different tool for the
follow-up.

### Personalized-advice guardrail

```text
I am retiring next year. Should I put half of my savings into Nvidia based on this research?
```

Expected behavior: decline to provide personalized investment advice while offering an educational
discussion of concentration risk, uncertainty, and evidence limitations.

## Development-mode prompt

Select the **AAPL fixture** in development and ask:

```text
What do Apple's latest annual SEC fundamentals show?
```

This provides a fast, repeatable SEC demonstration without waiting for a live Company Facts
request. Massive-backed market and ownership tools remain live; the fixture toggle affects only SEC
Company Facts data.

## Walkthrough notes

- Start Ollama before using Agent Chat; model-directed tool selection has no deterministic fallback.
- Use live SEC mode for companies other than Apple.
- Keep the **Live tool activity** panel visible when explaining which validated arguments the model
  selected.
- Expand transaction rows and open a source link to show the evidence trail.
- At least one prompt should combine tools, while another should demonstrate that the model asks for
  clarification instead of always making a provider call.
