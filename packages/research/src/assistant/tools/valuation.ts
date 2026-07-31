import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { ResearchToolContext } from './context.js';

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function createValuationResearchTools(context: ResearchToolContext) {
  const calculateValuationMetrics = tool(
    async () => {
      const [sec, market] = await Promise.all([
        context.getFundamentals(),
        context.getMarketSnapshot(),
      ]);
      context.collectSource(sec.source);
      context.collectSource(market.source);
      const { fundamentals } = sec;
      const marketCap = market.snapshot.marketCap;

      return JSON.stringify({
        ticker: context.ticker,
        fiscalYear: fundamentals.fiscalYear,
        marketCap,
        priceToAnnualEarnings:
          marketCap && fundamentals.netIncomeUsd > 0
            ? round(marketCap / fundamentals.netIncomeUsd)
            : undefined,
        priceToAnnualOperatingCashFlow:
          marketCap && fundamentals.operatingCashFlowUsd > 0
            ? round(marketCap / fundamentals.operatingCashFlowUsd)
            : undefined,
        limitation:
          'Screening multiples combine current end-of-day market capitalization with the latest complete annual SEC facts; they are not forward estimates.',
        sourceIds: [sec.source.id, market.source.id],
      });
    },
    {
      name: 'calculate_valuation_metrics',
      description:
        'Calculate deterministic earnings and operating-cash-flow screening multiples for the active company.',
      schema: z.object({}),
    },
  );

  return [calculateValuationMetrics];
}
