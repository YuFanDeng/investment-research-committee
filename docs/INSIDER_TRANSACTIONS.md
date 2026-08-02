# Insider Transactions Tool

## Decision

Add `get_insider_transactions` as a read-only Agent Chat tool backed by Massive's normalized SEC
Form 4 endpoint. The model decides when ownership evidence is relevant, but TypeScript owns query
construction, validation, transaction classification, filtering, aggregation, and source tracking.

The tool is implemented in its own `ownership.ts` category because ownership research has different
concepts and guardrails from market prices, SEC fundamentals, and valuation calculations.

## Provider contract

The Massive adapter supports every documented Form 4 query parameter while keeping provider syntax
out of prompts:

| Massive parameter  | Adapter field        | Model-facing control                           |
| ------------------ | -------------------- | ---------------------------------------------- |
| `issuer_cik`       | `issuerCik`          | Optional 10-digit issuer CIK                   |
| `owner_cik`        | `ownerCik`           | Optional 10-digit reporting-owner CIK          |
| `tickers`          | `ticker`             | Required normalized U.S. ticker                |
| `form_type`        | `formType`           | Original, amendment, or both                   |
| `filing_date`      | Date range modifiers | Lookback window or explicit start/end dates    |
| `transaction_code` | `transactionCode`    | Derived internally from an activity type       |
| `limit`            | `limit`              | Provider scan limit and smaller response limit |
| `sort`             | `sort`               | Provider filing-date sort plus local ordering  |

Massive documents the endpoint as an early-access beta that is updated daily. The adapter is
isolated so a future endpoint version or direct SEC ownership-XML implementation will not change
the agent contract.

## Model-facing input

```ts
get_insider_transactions({
  ticker: 'AAPL',
  lookbackDays: 90,
  activityTypes: ['open_market_purchases', 'open_market_sales'],
  formType: 'original',
  ownershipType: 'all',
  planStatus: 'all',
  securityType: 'non-derivative',
  insiderRoles: ['officer', 'director'],
  sortBy: 'transaction_date',
  sortOrder: 'desc',
  detailStrategy: 'most_relevant',
  limit: 8,
});
```

The available controls are:

- A 1–730-day lookback or explicit filing-date range.
- Optional issuer and reporting-owner CIK filters.
- One or more meaningful activity types: open-market purchases, open-market sales, compensation,
  derivatives, gifts and transfers, or other activity.
- The special `all` activity type is used by itself and leaves transaction codes unfiltered.
- Original filings, amendments, or both.
- Direct, indirect, or undisclosed ownership.
- Reported Rule 10b5-1, reported non-plan, or undisclosed plan status.
- Derivative or non-derivative securities.
- Officer, director, 10% owner, or other reporting-person roles.
- Filing date, transaction date, or disclosed value sorting.
- Most-relevant or strictly requested-sort detail selection.
- One to twelve detailed results, with eight as the default.

Raw Form 4 codes are intentionally absent from the model-facing schema. This prevents the model
from treating an alphabetically ordered code enum as an importance ranking. TypeScript translates
the semantic activity types into the exact provider and local filters:

| Activity type         | Form 4 codes                 |
| --------------------- | ---------------------------- |
| Open-market purchases | `P`                          |
| Open-market sales     | `S`                          |
| Compensation          | `A`, `F`, `I`, `M`           |
| Derivatives           | `C`, `E`, `H`, `K`, `O`, `X` |
| Gifts and transfers   | `G`, `W`, `Z`                |
| Other                 | `D`, `J`, `L`, `U`, `V`      |

When the user asks for all activity, the tool sends no transaction-code filter. It summarizes all
matching records in the 250-record bounded scan, then sends at most 12 details to the model.
`most_relevant` details show open-market purchases and sales first, followed by compensation,
gifts and transfers, derivatives, and other activity. Date or value ordering breaks ties within a
group. This is a presentation heuristic: it makes discretionary market activity easier to see but
does not claim that any transaction is financially material.

## Deterministic interpretation

The tool maps common SEC codes before the data reaches the model:

| Code  | Category                              |
| ----- | ------------------------------------- |
| `P`   | Open-market purchase                  |
| `S`   | Open-market sale                      |
| `A`   | Grant or award                        |
| `M`   | Option exercise or conversion         |
| `F`   | Tax or exercise-cost withholding      |
| `G`   | Gift                                  |
| Other | Preserved as another transaction type |

This prevents grants, exercises, gifts, and tax withholding from being described as discretionary
open-market trading.

The result also preserves:

- Insider identity, title, roles, and owner CIK.
- Transaction and filing dates, code, direction, shares, price, and disclosed value.
- Security title, derivative context, exercise terms, and post-transaction ownership.
- Direct or indirect ownership and the reported nature of indirect ownership.
- Rule 10b5-1 status, filing timeliness, equity-swap involvement, remarks, and bounded footnotes.
- Original submission date for amendments and the direct SEC filing source.

## Three-state disclosures

Optional booleans are never coerced into a negative answer. Plan status becomes:

```text
reported_10b5_1 | reported_not_10b5_1 | not_disclosed
```

Ownership becomes:

```text
direct | indirect | not_disclosed
```

This is important for older filings and incomplete records. Indirect ownership still represents
reported beneficial ownership through another person or entity; it does not mean unrelated.

## Context and source limits

- The provider request scans at most 250 records.
- Semantic activity-to-code mapping, filters, relevance ordering, and summaries run
  deterministically in TypeScript.
- The beta API is sorted by filing date; transaction-date and disclosed-value presentation sorts
  are applied locally over the bounded provider result.
- At most 12 detailed transactions reach Ollama; the default is 8.
- Footnotes and remarks are length-bounded.
- Summary totals cover all matching transactions in the bounded scan; the response labels whether
  its detailed records are a representative bounded selection.
- `matchedTransactionCount` and `providerResultTruncated` disclose incomplete views.
- Original and amended filings are not silently deduplicated; the result warns when both are used.
- Every returned transaction retains a source ID linked to its SEC filing.
- If the beta response omits `filing_url`, the adapter reconstructs the canonical SEC archive URL
  from the issuer CIK and accession number.

## Interpretation guardrails

- A reported Rule 10b5-1 plan provides execution context, not proof of motivation.
- A sale does not by itself establish a negative view of the company.
- An indirect transaction still belongs to the reporting person's beneficial-ownership disclosure.
- Disclosed transaction value may be missing when shares or price are unavailable.
- “No matching transactions” means none were returned for the selected filters and coverage window.

References:

- [Massive Form 4 API](https://massive.com/docs/rest/stocks/filings/form-4)
- [SEC Rule 10b5-1 disclosure changes](https://www.sec.gov/newsroom/press-releases/2022-222)
- [SEC Forms 3, 4, and 5 guide](https://www.sec.gov/files/forms-3-4-5.pdf)
