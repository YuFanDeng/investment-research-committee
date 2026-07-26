import { describe, expect, it } from 'vitest';

import { buildAnalystMessages, buildFinalChairMessages } from './committee.js';

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

  it('keeps the final chair prompt focused on review artifacts', () => {
    const [, [, humanMessage]] = buildFinalChairMessages({
      ticker: 'TEST',
      companyName: 'Test Company',
      analystReports: [
        {
          role: 'valuation',
          thesis: 'The evidence supports a cautious valuation view.',
          supportingEvidence: ['Market context is available.'],
          concerns: ['Multiples are incomplete.'],
          confidence: 0.6,
          sourceIdsUsed: ['market-test'],
        },
      ],
      draftMemo: {
        companySnapshot: 'Test Company reported a compact snapshot.',
        financialHighlights: ['Revenue is available.'],
        whatStandsOut: ['Cash flow is positive.'],
        risksAndLimitations: ['The evidence is limited.'],
        sourceIdsUsed: ['sec-test'],
        disclaimer: 'For educational research only.',
      },
      challengeReport: {
        thesisWeaknesses: ['The sample is narrow.'],
        unsupportedClaims: [],
        missingEvidence: ['More filings are needed.'],
        keyRisks: ['Market conditions can change.'],
        requiredRevisions: ['Keep uncertainty visible.'],
        confidence: 0.8,
        sourceIdsUsed: ['sec-test'],
      },
      sourceIds: ['sec-test', 'market-test'],
    });

    expect(humanMessage).toContain('draftMemo');
    expect(humanMessage).toContain('challengeReport');
    expect(humanMessage).not.toContain('fundamentals');
    expect(humanMessage).not.toContain('historicalCloses');
  });
});
