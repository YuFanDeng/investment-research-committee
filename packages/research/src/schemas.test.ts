import { describe, expect, it } from 'vitest';

import { ResearchMemoSchema, ResearchRequestSchema } from './schemas.js';
import { ResearchAssistantRequestSchema } from './assistant/schemas.js';

describe('research schemas', () => {
  it('normalizes valid ticker input', () => {
    expect(ResearchRequestSchema.parse({ ticker: ' aapl ' })).toEqual({
      ticker: 'AAPL',
      secDataMode: 'live',
    });
  });

  it('rejects malformed ticker input', () => {
    expect(() => ResearchRequestSchema.parse({ ticker: 'not a ticker' })).toThrow();
  });

  it('accepts the structured memo contract', () => {
    expect(
      ResearchMemoSchema.parse({
        companySnapshot: 'Apple reported annual results.',
        financialHighlights: ['Revenue was $416.2B.'],
        whatStandsOut: ['Cash generation remained substantial.'],
        risksAndLimitations: ['This is not investment advice.'],
        sourceIdsUsed: ['sec-company-facts-0000320193'],
        disclaimer: 'For educational research only.',
      }),
    ).toHaveProperty('sourceIdsUsed');
  });

  it('bounds conversational assistant input', () => {
    const result = ResearchAssistantRequestSchema.parse({
      ticker: ' aapl ',
      question: 'How has the stock performed?',
      history: [{ role: 'user', content: 'Start with the last year.' }],
    });

    expect(result.ticker).toBe('AAPL');
    expect(result.history).toHaveLength(1);
  });
});
