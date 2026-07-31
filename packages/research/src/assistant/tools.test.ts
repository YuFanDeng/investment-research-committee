import { describe, expect, it } from 'vitest';

import { createResearchTools } from './tools/catalog.js';

const secSource = {
  id: 'sec-test',
  title: 'Test SEC facts',
  url: 'https://data.sec.gov/test',
  sourceType: 'sec_filing' as const,
  retrievedAt: '2026-07-31T00:00:00.000Z',
};

const marketSource = {
  id: 'market-test',
  title: 'Test market data',
  url: 'https://massive.com/stocks/TEST',
  sourceType: 'market_data' as const,
  retrievedAt: '2026-07-31T00:00:00.000Z',
};

function createToolkit() {
  return createResearchTools({
    ticker: 'TEST',
    secClient: {
      getFundamentals: async () => ({
        companyName: 'Test Company',
        fundamentals: {
          fiscalYear: 2025,
          revenueUsd: 1_000,
          netIncomeUsd: 100,
          operatingCashFlowUsd: 125,
        },
        source: secSource,
      }),
      getRecentFilings: async () => ({ companyName: 'Test Company', filings: [] }),
    },
    marketClient: {
      getMarketSnapshot: async () => ({
        snapshot: {
          currentPrice: 20,
          historicalCloses: [],
          marketCap: 2_000,
          currency: 'usd',
          adjusted: true,
          retrievedAt: marketSource.retrievedAt,
          sourceId: marketSource.id,
          peers: [],
        },
        source: marketSource,
      }),
      getPriceHistory: async (_ticker, days) => ({
        ticker: 'TEST',
        days,
        historicalCloses: [
          { date: '2026-07-01', close: 10 },
          { date: '2026-07-31', close: 12 },
        ],
        source: marketSource,
      }),
    },
  });
}

describe('research assistant tools', () => {
  it('calculates valuation metrics from tool data instead of model arithmetic', async () => {
    const toolkit = createToolkit();
    const valuationTool = toolkit.tools.find(
      (candidate) => candidate.name === 'calculate_valuation_metrics',
    );

    const result = JSON.parse(String(await valuationTool!.invoke({}))) as Record<string, unknown>;

    expect(result.priceToAnnualEarnings).toBe(20);
    expect(result.priceToAnnualOperatingCashFlow).toBe(16);
    expect(toolkit.getSources().map((source) => source.id)).toEqual(['sec-test', 'market-test']);
  });

  it('summarizes price history before returning it to the model', async () => {
    const historyTool = createToolkit().tools.find(
      (candidate) => candidate.name === 'get_price_history',
    );

    const result = JSON.parse(String(await historyTool!.invoke({ days: 30 }))) as Record<
      string,
      unknown
    >;

    expect(result.returnPercent).toBe(20);
    expect(result.observationCount).toBe(2);
    expect(result).not.toHaveProperty('historicalCloses');
  });
});
