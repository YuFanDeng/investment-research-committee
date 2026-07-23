import { describe, expect, it } from 'vitest';

import { buildAnalystMessages } from './committee.js';

describe('committee prompt evidence', () => {
  it('sends compact market metrics instead of raw historical bars', () => {
    const [, [, humanMessage]] = buildAnalystMessages('valuation', {
      ticker: 'TEST',
      fundamentals: {
        fiscalYear: 2025,
        revenueUsd: 100,
        netIncomeUsd: 20,
        operatingCashFlowUsd: 30,
      },
      marketSnapshot: {
        currentPrice: 110,
        previousClose: 110,
        historicalCloses: [
          { date: '2026-01-01', close: 100 },
          { date: '2026-01-02', close: 110 },
        ],
        marketCap: 1_000,
        currency: 'USD',
        adjusted: true,
        retrievedAt: '2026-07-22T00:00:00.000Z',
        sourceId: 'market-test',
        peers: [],
      },
      sources: [],
    });

    expect(humanMessage).not.toContain('historicalCloses');
    expect(humanMessage).toContain('oneYearReturn');
    expect(humanMessage).toContain('annualizedVolatility');
    expect(humanMessage).toContain('maximumDrawdown');
  });
});
