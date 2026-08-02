import { describe, expect, it } from 'vitest';

import type { MassiveForm4Query } from '../tools/massive-form4.js';
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

function createToolkit(
  onPriceHistoryRequest: () => void = () => undefined,
  onOwnershipRequest: (query: MassiveForm4Query) => void = () => undefined,
) {
  return createResearchTools({
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
      getQuarterlyFundamentals: async (_ticker, periods = 8) => ({
        companyName: 'Test Company',
        fundamentals: Array.from({ length: periods }, (_, index) => ({
          fiscalYear: 2025,
          fiscalQuarter: `Q${(index % 4) + 1}` as 'Q1' | 'Q2' | 'Q3' | 'Q4',
          periodStart: `2025-0${index + 1}-01`,
          periodEnd: `2025-0${index + 1}-28`,
          revenueUsd: 200 + index,
          derivation: 'reported' as const,
        })),
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
      getPriceHistory: async (_ticker, days) => {
        onPriceHistoryRequest();
        return {
          ticker: 'TEST',
          days,
          historicalCloses: [
            { date: '2026-07-01', close: 10 },
            { date: '2026-07-31', close: 12 },
          ],
          source: marketSource,
        };
      },
    },
    ownershipClient: {
      getTransactions: async (query) => {
        onOwnershipRequest(query);
        return {
          transactions: [
            {
              accessionNumber: '0000000000-26-000001',
              filingDate: '2026-07-15',
              filingUrl: 'https://www.sec.gov/test-form-4',
              formType: '4',
              issuerName: 'Test Company',
              tickers: ['TEST'],
              ownerCik: '0000000001',
              ownerName: 'Test Insider',
              officerTitle: 'Chief Executive Officer',
              roles: ['officer' as const],
              transactionDate: '2026-07-14',
              transactionCode: 'S',
              acquiredOrDisposed: 'disposed' as const,
              shares: 100,
              pricePerShare: 20,
              value: 2_000,
              planStatus: 'reported_10b5_1' as const,
              ownershipType: 'indirect' as const,
              natureOfOwnership: 'By Trust',
              filingTimeliness: 'on_time' as const,
              footnotes: [],
              recordType: 'transaction',
            },
          ],
          sources: [
            {
              id: 'sec-form4-0000000000-26-000001',
              title: 'Test Company — Form 4',
              url: 'https://www.sec.gov/test-form-4',
              sourceType: 'sec_filing' as const,
              retrievedAt: '2026-07-31T00:00:00.000Z',
            },
          ],
        };
      },
    },
  });
}

describe('research assistant tools', () => {
  it('calculates valuation metrics from tool data instead of model arithmetic', async () => {
    const toolkit = createToolkit();
    const valuationTool = toolkit.tools.find(
      (candidate) => candidate.name === 'calculate_valuation_metrics',
    );

    const result = JSON.parse(String(await valuationTool!.invoke({ ticker: 'TEST' }))) as Record<
      string,
      unknown
    >;

    expect(result.priceToAnnualEarnings).toBe(20);
    expect(result.priceToAnnualOperatingCashFlow).toBe(16);
    expect(toolkit.getSources().map((source) => source.id)).toEqual(['sec-test', 'market-test']);
  });

  it('summarizes price history before returning it to the model', async () => {
    const historyTool = createToolkit().tools.find(
      (candidate) => candidate.name === 'get_price_history',
    );

    const result = JSON.parse(
      String(await historyTool!.invoke({ ticker: 'TEST', days: 30 })),
    ) as Record<string, unknown>;

    expect(result.returnPercent).toBe(20);
    expect(result.observationCount).toBe(2);
    expect(result).not.toHaveProperty('historicalCloses');
  });

  it('rejects an invalid ticker inferred by the model before calling a provider', async () => {
    const fundamentalsTool = createToolkit().tools.find(
      (candidate) => candidate.name === 'get_sec_fundamentals',
    );

    await expect(fundamentalsTool!.invoke({ ticker: 'Apple Inc.' })).rejects.toThrow();
  });

  it('returns quarterly revenue through the existing SEC fundamentals tool', async () => {
    const fundamentalsTool = createToolkit().tools.find(
      (candidate) => candidate.name === 'get_sec_fundamentals',
    );

    const result = JSON.parse(
      String(await fundamentalsTool!.invoke({ ticker: 'TEST', period: 'quarterly', periods: 8 })),
    ) as { period: string; fundamentals: unknown[] };

    expect(result.period).toBe('quarterly');
    expect(result.fundamentals).toHaveLength(8);
  });

  it('reuses cached 365-day history across market and technical tools', async () => {
    let priceHistoryRequests = 0;
    const toolkit = createToolkit(() => {
      priceHistoryRequests += 1;
    });
    const historyTool = toolkit.tools.find((candidate) => candidate.name === 'get_price_history');
    const movingAverageTool = toolkit.tools.find(
      (candidate) => candidate.name === 'calculate_moving_averages',
    );

    await historyTool!.invoke({ ticker: 'TEST', days: 365 });
    const result = JSON.parse(
      String(await movingAverageTool!.invoke({ ticker: 'TEST', periods: [120, 120] })),
    ) as Record<string, unknown>;

    expect(priceHistoryRequests).toBe(1);
    expect(result).toMatchObject({
      ticker: 'TEST',
      calculation: 'simple_moving_average',
      observationCount: 2,
      movingAverages: [
        {
          period: 120,
          status: 'insufficient_data',
          requiredObservations: 120,
          availableObservations: 2,
        },
      ],
    });
    expect(result).not.toHaveProperty('historicalCloses');
  });

  it('rejects out-of-range or fractional periods before requesting market data', async () => {
    let priceHistoryRequests = 0;
    const movingAverageTool = createToolkit(() => {
      priceHistoryRequests += 1;
    }).tools.find((candidate) => candidate.name === 'calculate_moving_averages');

    for (const invalidPeriod of [1, 251, 12.5]) {
      await expect(
        movingAverageTool!.invoke({ ticker: 'TEST', periods: [invalidPeriod] }),
      ).rejects.toThrow();
    }
    expect(priceHistoryRequests).toBe(0);
  });

  it('summarizes plan and ownership context for insider transactions', async () => {
    const toolkit = createToolkit();
    const insiderTool = toolkit.tools.find(
      (candidate) => candidate.name === 'get_insider_transactions',
    );

    const result = JSON.parse(
      String(
        await insiderTool!.invoke({
          ticker: 'TEST',
          lookbackDays: 90,
          ownershipType: 'indirect',
          planStatus: 'reported_10b5_1',
          securityType: 'all',
          formType: 'original',
          sortBy: 'transaction_date',
          sortOrder: 'desc',
          limit: 10,
        }),
      ),
    ) as Record<string, unknown>;

    expect(result).toMatchObject({
      ticker: 'TEST',
      matchedTransactionCount: 1,
      summary: {
        transactionCount: 1,
        byPlanStatus: { reported_10b5_1: 1 },
        byOwnershipType: { indirect: 1 },
      },
      transactions: [
        {
          executionContext: {
            planStatus: 'reported_10b5_1',
            ownershipType: 'indirect',
            natureOfOwnership: 'By Trust',
          },
        },
      ],
    });
    expect(toolkit.getSources().map((source) => source.id)).toEqual([
      'sec-form4-0000000000-26-000001',
    ]);
  });

  it('treats all insider activity as an unfiltered provider scan', async () => {
    let providerQuery: MassiveForm4Query | undefined;
    const insiderTool = createToolkit(undefined, (query) => {
      providerQuery = query;
    }).tools.find((candidate) => candidate.name === 'get_insider_transactions');

    const result = JSON.parse(
      String(
        await insiderTool!.invoke({
          ticker: 'TEST',
          lookbackDays: 730,
          activityTypes: ['all'],
        }),
      ),
    ) as { query: { activityTypes: string[] }; summaryScope: string };

    expect(providerQuery?.transactionCode).toBeUndefined();
    expect(result.query.activityTypes).toEqual(['all']);
    expect(result.summaryScope).toBe('all_matched_transactions_in_bounded_scan');
  });

  it('rejects combining all activity with narrower insider categories', async () => {
    const insiderTool = createToolkit().tools.find(
      (candidate) => candidate.name === 'get_insider_transactions',
    );

    await expect(
      insiderTool!.invoke({
        ticker: 'TEST',
        activityTypes: ['all', 'open_market_sales'],
      }),
    ).rejects.toThrow('Use "all" by itself');
  });
});
