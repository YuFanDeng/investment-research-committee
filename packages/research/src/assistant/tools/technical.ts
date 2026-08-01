import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import {
  calculateSimpleMovingAverages,
  MAX_MOVING_AVERAGE_PERIOD,
  MIN_MOVING_AVERAGE_PERIOD,
} from '../../technical/moving-average.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';

const MovingAveragePeriodSchema = z
  .number()
  .int()
  .min(MIN_MOVING_AVERAGE_PERIOD)
  .max(MAX_MOVING_AVERAGE_PERIOD);

export function createTechnicalResearchTools(context: ResearchToolContext) {
  const calculateMovingAverages = tool(
    async ({ ticker, periods }) => {
      const result = await context.getPriceHistory(ticker, 365);
      context.collectSource(result.source);
      const analysis = calculateSimpleMovingAverages(result.historicalCloses, periods);

      return JSON.stringify({
        ticker,
        calculation: 'simple_moving_average',
        ...analysis,
        sourceIds: [result.source.id],
        limitation:
          'Moving averages use adjusted daily closing prices and describe historical price behavior; they are not trading recommendations.',
      });
    },
    {
      name: 'calculate_moving_averages',
      description:
        'Calculate custom 2 to 250-session simple moving averages for a U.S. stock and compare its latest close with each average. Common periods are 5, 10, 20, 50, 100, and 200.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        periods: z
          .array(MovingAveragePeriodSchema)
          .min(1)
          .max(6)
          .transform((values) => [...new Set(values)].sort((left, right) => left - right))
          .default([20, 50, 200]),
      }),
    },
  );

  return [calculateMovingAverages];
}
