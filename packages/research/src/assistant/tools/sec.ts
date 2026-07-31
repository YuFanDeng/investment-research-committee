import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { RecentSecFilings } from '../../tools/sec-edgar.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';

export function createSecResearchTools(context: ResearchToolContext) {
  const getSecFundamentals = tool(
    async ({ ticker }) => {
      const result = await context.getFundamentals(ticker);
      context.collectSource(result.source);
      return JSON.stringify({
        ticker,
        companyName: result.companyName,
        fundamentals: result.fundamentals,
        sourceIds: [result.source.id],
      });
    },
    {
      name: 'get_sec_fundamentals',
      description:
        'Get a company’s latest complete annual SEC revenue, net income, and operating cash flow. Resolve the company in the question to its U.S. ticker.',
      schema: z.object({ ticker: AssistantTickerSchema }),
    },
  );

  const getRecentFilings = tool(
    async ({ ticker, formTypes, limit }) => {
      const result: RecentSecFilings = await context.secClient.getRecentFilings(
        ticker,
        formTypes,
        limit,
      );
      result.filings.forEach((filing) => context.collectSource(filing.source));
      return JSON.stringify({
        ticker,
        companyName: result.companyName,
        filings: result.filings.map(({ source, ...filing }) => ({
          ...filing,
          sourceId: source.id,
        })),
      });
    },
    {
      name: 'get_recent_filings',
      description:
        'List recent SEC 10-K, 10-Q, or 8-K filings for a company. Resolve the company in the question to its U.S. ticker.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        formTypes: z
          .array(z.enum(['10-K', '10-Q', '8-K']))
          .min(1)
          .max(3)
          .default(['10-K', '10-Q', '8-K']),
        limit: z.number().int().min(1).max(8).default(5),
      }),
    },
  );

  return [getSecFundamentals, getRecentFilings];
}
