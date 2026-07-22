import { describe, expect, it } from 'vitest';

import { buildMemoWriterMessages, MEMO_WRITER_SYSTEM_PROMPT } from './memo-writer.js';

describe('memo writer prompt', () => {
  it('includes normalized evidence and source identifiers', () => {
    const messages = buildMemoWriterMessages({
      ticker: 'AAPL',
      companyName: 'Apple Inc.',
      fundamentals: {
        fiscalYear: 2025,
        revenueUsd: 416_161_000_000,
        netIncomeUsd: 112_010_000_000,
        operatingCashFlowUsd: 111_482_000_000,
      },
      sources: [
        {
          id: 'sec-company-facts-0000320193',
          title: 'Apple Inc. — SEC EDGAR Company Facts',
          url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
          sourceType: 'sec_filing',
          retrievedAt: '2026-07-21T14:57:56.990Z',
        },
      ],
    });

    expect(messages[0]).toEqual(['system', MEMO_WRITER_SYSTEM_PROMPT]);
    expect(messages[1][1]).toContain('AAPL');
    expect(messages[1][1]).toContain('sec-company-facts-0000320193');
  });
});
