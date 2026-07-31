import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { RecentSecFilings } from '../../tools/sec-edgar.js';
import type { ResearchToolContext } from './context.js';

export function createSecResearchTools(context: ResearchToolContext) {
  const getSecFundamentals = tool(
    async () => {
      const result = await context.getFundamentals();
      context.collectSource(result.source);
      return JSON.stringify({
        ticker: context.ticker,
        companyName: result.companyName,
        fundamentals: result.fundamentals,
        sourceIds: [result.source.id],
      });
    },
    {
      name: 'get_sec_fundamentals',
      description:
        'Get the active company’s latest complete annual SEC revenue, net income, and operating cash flow.',
      schema: z.object({}),
    },
  );

  const getRecentFilings = tool(
    async ({ formTypes, limit }) => {
      const result: RecentSecFilings = await context.secClient.getRecentFilings(
        context.ticker,
        formTypes,
        limit,
      );
      result.filings.forEach((filing) => context.collectSource(filing.source));
      return JSON.stringify({
        ticker: context.ticker,
        companyName: result.companyName,
        filings: result.filings.map(({ source, ...filing }) => ({
          ...filing,
          sourceId: source.id,
        })),
      });
    },
    {
      name: 'get_recent_filings',
      description: 'List recent SEC 10-K, 10-Q, or 8-K filings for the active company.',
      schema: z.object({
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
