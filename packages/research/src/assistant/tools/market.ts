import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import type { PriceHistoryResult } from '../../tools/massive.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function summarizePriceHistory(result: PriceHistoryResult) {
  const closes = result.historicalCloses;
  const first = closes[0];
  const last = closes.at(-1);
  let peak = first?.close;
  let maximumDrawdown = 0;

  for (const bar of closes) {
    if (peak === undefined || bar.close > peak) peak = bar.close;
    if (peak) maximumDrawdown = Math.min(maximumDrawdown, (bar.close - peak) / peak);
  }

  const sampleSize = Math.min(12, closes.length);
  const sampledCloses = Array.from({ length: sampleSize }, (_, index) => {
    const sourceIndex =
      sampleSize === 1 ? 0 : Math.round((index * (closes.length - 1)) / (sampleSize - 1));
    return closes[sourceIndex];
  });

  return {
    ticker: result.ticker,
    requestedDays: result.days,
    observationCount: closes.length,
    start: first,
    end: last,
    returnPercent:
      first && last ? round(((last.close - first.close) / first.close) * 100) : undefined,
    periodHigh: closes.length ? Math.max(...closes.map((bar) => bar.close)) : undefined,
    periodLow: closes.length ? Math.min(...closes.map((bar) => bar.close)) : undefined,
    maximumDrawdownPercent: round(maximumDrawdown * 100),
    sampledCloses,
    sourceIds: [result.source.id],
  };
}

export function createMarketResearchTools(context: ResearchToolContext) {
  const getMarketSnapshot = tool(
    async ({ ticker }) => {
      const result = await context.getMarketSnapshot(ticker);
      context.collectSource(result.source);
      const { historicalCloses: _history, ...compactSnapshot } = result.snapshot;
      return JSON.stringify({
        ticker,
        ...compactSnapshot,
        sourceIds: [result.source.id],
      });
    },
    {
      name: 'get_market_snapshot',
      description:
        'Get a company’s latest end-of-day price, market capitalization, and related companies. Resolve the company in the question to its U.S. ticker.',
      schema: z.object({ ticker: AssistantTickerSchema }),
    },
  );

  const getPriceHistory = tool(
    async ({ ticker, days }) => {
      const result = await context.getPriceHistory(ticker, days);
      context.collectSource(result.source);
      return JSON.stringify(summarizePriceHistory(result));
    },
    {
      name: 'get_price_history',
      description:
        'Get a compact price-performance summary for a company over 30, 90, or 365 days. Resolve the company in the question to its U.S. ticker.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        days: z.union([z.literal(30), z.literal(90), z.literal(365)]),
      }),
    },
  );

  return [getMarketSnapshot, getPriceHistory];
}
