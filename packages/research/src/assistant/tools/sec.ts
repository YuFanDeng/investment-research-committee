import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { RecentSecFilings } from '../../tools/sec-edgar.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';

export function createSecResearchTools(context: ResearchToolContext) {
  const getSecFundamentals = tool(
    async ({ ticker, period, periods }) => {
      const requestedPeriods = periods ?? 8;
      const result =
        period === 'quarterly'
          ? await context.getQuarterlyFundamentals(ticker, requestedPeriods)
          : await context.getFundamentals(ticker);
      context.collectSource(result.source);
      return JSON.stringify({
        ticker,
        companyName: result.companyName,
        period,
        fundamentals: result.fundamentals,
        sourceIds: [result.source.id],
      });
    },
    {
      name: 'get_sec_fundamentals',
      description:
        'Get SEC fundamentals for a company. Use period="annual" for the latest annual revenue, net income, and operating cash flow. Use period="quarterly" for a quarterly revenue trend; periods controls how many quarters are returned (two years is 8). Resolve the company in the question to its U.S. ticker.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        period: z.enum(['annual', 'quarterly']).default('annual'),
        periods: z.number().int().min(1).max(12).optional(),
      }),
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
