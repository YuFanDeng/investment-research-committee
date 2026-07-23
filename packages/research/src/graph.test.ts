import { describe, expect, it } from 'vitest';

import { createResearchGraph } from './graph.js';

const secResult = {
  companyName: 'Test Company',
  fundamentals: {
    fiscalYear: 2025,
    revenueUsd: 100,
    netIncomeUsd: 20,
    operatingCashFlowUsd: 30,
  },
  source: {
    id: 'sec-test-source',
    title: 'Test SEC source',
    url: 'https://data.sec.gov/test.json',
    sourceType: 'sec_filing' as const,
    retrievedAt: '2026-07-21T00:00:00.000Z',
  },
};

function createTestGraph(
  invokeMemoModel: Parameters<typeof createResearchGraph>[0]['invokeMemoModel'],
) {
  return createResearchGraph({
    secContactEmail: 'test@example.com',
    modelEnvironment: {},
    secClient: { getFundamentals: async () => secResult },
    invokeMemoModel,
  });
}

describe('research committee graph', () => {
  it('accepts a structured model response', async () => {
    const graph = createTestGraph(async () => ({
      companySnapshot: 'Test Company reported annual results.',
      financialHighlights: ['Revenue was $100.'],
      whatStandsOut: ['Operating cash flow was positive.'],
      risksAndLimitations: ['This is educational research.'],
      sourceIdsUsed: ['sec-test-source'],
      disclaimer: 'For educational research only.',
    }));

    const result = await graph.invoke({ ticker: 'TEST' });

    expect(result.status).toBe('complete');
    expect(result.memo?.sourceIdsUsed).toEqual(['sec-test-source']);
    expect(result.analystReports.map((report) => report.role).sort()).toEqual([
      'business_quality',
      'fundamentals',
      'valuation',
    ]);
    expect(result.challengeReport?.requiredRevisions.length).toBeGreaterThan(0);
  });

  it('returns deterministic facts when the model fails', async () => {
    const graph = createTestGraph(async () => {
      throw new Error('Ollama is not running');
    });

    const result = await graph.invoke({ ticker: 'TEST' });

    expect(result.status).toBe('complete');
    expect(result.memo?.financialHighlights[0]).toContain('FY2025 revenue');
    expect(result.errors.some((error) => error.includes('deterministic SEC facts'))).toBe(true);
  });
});
