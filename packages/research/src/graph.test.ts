import { describe, expect, it } from 'vitest';

import { createResearchCheckpointer, createResearchGraph, createResumeCommand } from './graph.js';

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

  it('streams node updates for progressive UI artifacts', async () => {
    const graph = createTestGraph(async () => ({
      companySnapshot: 'Test Company reported annual results.',
      financialHighlights: ['Revenue was $100.'],
      whatStandsOut: ['Operating cash flow was positive.'],
      risksAndLimitations: ['This is educational research.'],
      sourceIdsUsed: ['sec-test-source'],
      disclaimer: 'For educational research only.',
    }));
    const stream = await graph.stream({ ticker: 'TEST' }, {
      streamMode: ['values', 'updates', 'tasks'],
    } as never);
    const updatedNodes = new Set<string>();

    for await (const chunk of stream as AsyncIterable<unknown>) {
      if (!Array.isArray(chunk) || chunk[0] !== 'updates') continue;
      const update = chunk[1] as Record<string, unknown>;
      Object.keys(update).forEach((node) => updatedNodes.add(node));
    }

    expect(updatedNodes).toEqual(
      new Set([
        'validateTicker',
        'fetchSecFundamentals',
        'fetchMarketData',
        'fundamentalsAnalyst',
        'businessQualityAnalyst',
        'valuationAnalyst',
        'committeeDraft',
        'skepticChallenge',
        'humanApproval',
        'committeeChair',
      ]),
    );
  });

  it('resumes a paused run with human revision feedback', async () => {
    let finalChairPrompt = '';
    const graph = createResearchGraph({
      secContactEmail: 'test@example.com',
      modelEnvironment: {},
      secClient: { getFundamentals: async () => secResult },
      requireHumanApproval: true,
      checkpointer: createResearchCheckpointer(),
      invokeMemoModel: async (messages) => {
        finalChairPrompt = messages.at(-1)?.[1] ?? '';
        return {
          companySnapshot: 'The revised committee memo.',
          financialHighlights: ['Revenue was $100.'],
          whatStandsOut: ['The reviewer feedback was addressed.'],
          risksAndLimitations: ['Evidence remains limited.'],
          sourceIdsUsed: ['sec-test-source'],
          disclaimer: 'For educational research only.',
        };
      },
    });
    const config = { configurable: { thread_id: 'revision-test' } };

    const paused = (await graph.invoke({ ticker: 'TEST' }, config)) as unknown as Record<
      string,
      unknown
    >;
    expect(paused.__interrupt__).toBeDefined();

    const result = await graph.invoke(
      createResumeCommand({
        decision: 'revise',
        feedback: 'Make the evidence limitations more prominent.',
      }),
      config,
    );

    expect(result.status).toBe('complete');
    expect(result.memo?.companySnapshot).toBe('The revised committee memo.');
    expect(finalChairPrompt).toContain('Make the evidence limitations more prominent.');
  });

  it('ends a rejected run without publishing a final memo', async () => {
    let finalChairCalls = 0;
    const graph = createResearchGraph({
      secContactEmail: 'test@example.com',
      modelEnvironment: {},
      secClient: { getFundamentals: async () => secResult },
      requireHumanApproval: true,
      checkpointer: createResearchCheckpointer(),
      invokeMemoModel: async () => {
        finalChairCalls += 1;
        return {};
      },
    });
    const config = { configurable: { thread_id: 'rejection-test' } };

    await graph.invoke({ ticker: 'TEST' }, config);
    const result = await graph.invoke(
      createResumeCommand({ decision: 'reject', feedback: 'Insufficient evidence.' }),
      config,
    );

    expect(result.status).toBe('rejected');
    expect(result.memo).toBeUndefined();
    expect(finalChairCalls).toBe(0);
  });
});
