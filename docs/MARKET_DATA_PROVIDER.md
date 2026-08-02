# Market Data Provider Decision

## Decision

Use **Massive** (formerly Polygon) as the initial market-data provider for the valuation
analyst.

The first implementation will use the free Stocks Basic tier and end-of-day data. The
workflow does not need real-time prices for an auditable educational research memo.

## Why Massive

- Documented REST endpoints with a TypeScript-friendly integration path.
- U.S. stock ticker reference data and historical OHLC aggregates.
- Corporate-action support for splits and dividends.
- A free tier with 5 API calls per minute, two years of historical data, end-of-day data,
  and U.S. stock coverage.
- Clear upgrade path if the demo later needs delayed or real-time data.

Useful references:

- [Massive stocks API documentation](https://massive.com/docs/rest/stocks)
- [Massive pricing](https://massive.com/pricing?product=stocks)
- [Massive market-data terms](https://massive.com/terms/market_data_terms.pdf)

## Setup

1. Create an account at [massive.com](https://massive.com/).
2. Create a Stocks API key from the account dashboard.
3. Open or create the ignored root environment file at `.env`. Keep the
   existing SEC and Ollama values, and add:

   ```sh
   # edit .env
   ```

4. Add the key to `.env`:

   ```dotenv
   MASSIVE_API_KEY=your_key_here
   ```

For fast local development, use the SEC source toggle in the UI and choose the AAPL fixture.
The fixture bypasses the slower SEC EDGAR call while keeping Massive market data live, so the
valuation analyst still works with real prices and peers. Production accepts live SEC only.

5. Keep the key server-side. Do not put it in `apps/web`, commit it, or expose it to the
   browser. The repository ignores `.env` files.

## Initial data contract

The provider adapter should normalize Massive responses into a small domain object before
data enters LangGraph:

```ts
type MarketSnapshot = {
  currentPrice: number;
  previousClose?: number;
  historicalCloses: Array<{ date: string; close: number }>;
  marketCap?: number;
  currency: string;
  adjusted: boolean;
  retrievedAt: string;
  sourceId: string;
};
```

The adapter, not the LLM, will calculate price returns, volatility, drawdown, and valuation
ratios. The valuation analyst will interpret those typed values and identify missing inputs.

## Form 4 ownership data

Massive also provides normalized SEC Form 4 data through an early-access endpoint. Ownership data
uses a separate adapter and agent-tool category because transaction codes, reporting-person roles,
Rule 10b5-1 status, and direct or indirect ownership have different interpretation rules from
prices. The API key and server-only boundary remain the same. See
[Insider transactions tool](INSIDER_TRANSACTIONS.md).

## Scope and limitations

- End-of-day data is sufficient for the first research memo; real-time data is explicitly
  deferred.
- The valuation analyst must state when market cap, shares, peer data, or a current price is
  unavailable rather than inventing a value.
- Every market-data source will include a retrieval timestamp and provider source ID.
- We will isolate the provider behind a `MarketDataProvider` interface so Massive can be
  replaced later without changing analyst prompts or graph orchestration.

## Alternatives considered

- **Alpha Vantage:** credible and well documented, but the free tier is limited to 25
  requests per day and several full-history or real-time endpoints are premium.
- **Yahoo Finance:** convenient for local experiments, but common Node integrations use
  unofficial endpoints and Yahoo's terms restrict automated collection and data reuse. It is
  not the default provider for this project.
