import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { calculateBollingerBands } from '../../technical/bollinger-bands.js';
import { calculateExponentialMovingAverages } from '../../technical/exponential-moving-average.js';
import { calculateMacd } from '../../technical/macd.js';
import {
  calculateSimpleMovingAverages,
  MAX_MOVING_AVERAGE_PERIOD,
  MIN_MOVING_AVERAGE_PERIOD,
} from '../../technical/moving-average.js';
import { calculateRelativeStrengthIndex } from '../../technical/relative-strength-index.js';
import {
  createBollingerBandBlock,
  createMacdBlock,
  createMovingAverageBlock,
  createRsiBlock,
  type MovingAverageType,
} from '../technical-content-blocks.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';

const MovingAveragePeriodSchema = z
  .number()
  .int()
  .min(MIN_MOVING_AVERAGE_PERIOD)
  .max(MAX_MOVING_AVERAGE_PERIOD);

const MovingAverageTypeSchema = z.enum(['sma', 'ema']);
const MomentumIndicatorSchema = z.enum(['rsi', 'macd']);

function uniqueSortedNumbers(values: number[]) {
  return [...new Set(values)].sort((left, right) => left - right);
}

function uniqueValues<T>(values: T[]) {
  return [...new Set(values)];
}

export function createTechnicalResearchTools(context: ResearchToolContext) {
  const calculateMovingAverages = tool(
    async ({ ticker, periods, averageTypes }) => {
      const result = await context.getPriceHistory(ticker, 365);
      context.collectSource(result.source);

      const analyses = averageTypes.map((averageType: MovingAverageType) => ({
        averageType,
        analysis:
          averageType === 'sma'
            ? calculateSimpleMovingAverages(result.historicalCloses, periods)
            : calculateExponentialMovingAverages(result.historicalCloses, periods),
      }));
      const firstAnalysis = analyses[0].analysis;
      context.collectContentBlock(
        createMovingAverageBlock(
          ticker,
          result.historicalCloses,
          periods,
          averageTypes,
          result.source.id,
        ),
      );

      return JSON.stringify({
        ticker,
        calculation:
          averageTypes.length === 1
            ? averageTypes[0] === 'sma'
              ? 'simple_moving_average'
              : 'exponential_moving_average'
            : 'moving_averages',
        asOf: firstAnalysis.asOf,
        latestClose: firstAnalysis.latestClose,
        observationCount: firstAnalysis.observationCount,
        movingAverages: analyses.flatMap(({ averageType, analysis }) =>
          analysis.movingAverages.map((average) => ({ averageType, ...average })),
        ),
        sourceIds: [result.source.id],
        limitation:
          'Moving averages use adjusted daily closing prices and describe historical trend behavior; they are not trading recommendations.',
      });
    },
    {
      name: 'calculate_moving_averages',
      description:
        'Calculate custom 2 to 250-session simple moving averages (SMA), exponential moving averages (EMA), or both for a U.S. stock. Compare the latest close with each average and render interactive overlays. Common periods are 5, 10, 20, 50, 100, and 200.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        periods: z
          .array(MovingAveragePeriodSchema)
          .min(1)
          .max(6)
          .transform(uniqueSortedNumbers)
          .default([20, 50, 200]),
        averageTypes: z
          .array(MovingAverageTypeSchema)
          .min(1)
          .max(2)
          .transform(uniqueValues)
          .default(['sma']),
      }),
    },
  );

  const calculateMomentumIndicators = tool(
    async ({ ticker, indicators, rsiPeriod, macdFastPeriod, macdSlowPeriod, macdSignalPeriod }) => {
      const result = await context.getPriceHistory(ticker, 365);
      context.collectSource(result.source);
      const response: Record<string, unknown> = {
        ticker,
        sourceIds: [result.source.id],
        limitation:
          'RSI and MACD summarize historical closing-price momentum; conventional thresholds and crossovers are context, not automatic trading signals.',
      };

      if (indicators.includes('rsi')) {
        response.rsi = calculateRelativeStrengthIndex(result.historicalCloses, rsiPeriod);
        context.collectContentBlock(
          createRsiBlock(ticker, result.historicalCloses, rsiPeriod, result.source.id),
        );
      }
      if (indicators.includes('macd')) {
        const settings = {
          fastPeriod: macdFastPeriod,
          slowPeriod: macdSlowPeriod,
          signalPeriod: macdSignalPeriod,
        };
        response.macd = calculateMacd(result.historicalCloses, settings);
        context.collectContentBlock(
          createMacdBlock(ticker, result.historicalCloses, settings, result.source.id),
        );
      }

      return JSON.stringify(response);
    },
    {
      name: 'calculate_momentum_indicators',
      description:
        'Calculate close-only momentum indicators for a U.S. stock: Wilder RSI, MACD, or both. RSI defaults to 14 sessions. MACD defaults to 12-session fast EMA, 26-session slow EMA, and 9-session signal EMA. Use this for overextension, momentum, signal-line crossover, or zero-line questions.',
      schema: z
        .object({
          ticker: AssistantTickerSchema,
          indicators: z
            .array(MomentumIndicatorSchema)
            .min(1)
            .max(2)
            .transform(uniqueValues)
            .default(['rsi', 'macd']),
          rsiPeriod: z.number().int().min(2).max(50).default(14),
          macdFastPeriod: z.number().int().min(2).max(50).default(12),
          macdSlowPeriod: z.number().int().min(3).max(100).default(26),
          macdSignalPeriod: z.number().int().min(2).max(50).default(9),
        })
        .superRefine((value, refinementContext) => {
          if (value.macdFastPeriod >= value.macdSlowPeriod) {
            refinementContext.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['macdSlowPeriod'],
              message: 'The MACD slow period must be greater than the fast period.',
            });
          }
        }),
    },
  );

  const calculateVolatilityIndicators = tool(
    async ({ ticker, bollingerPeriod, standardDeviations }) => {
      const result = await context.getPriceHistory(ticker, 365);
      context.collectSource(result.source);
      const bollingerBands = calculateBollingerBands(
        result.historicalCloses,
        bollingerPeriod,
        standardDeviations,
      );
      context.collectContentBlock(
        createBollingerBandBlock(
          ticker,
          result.historicalCloses,
          bollingerPeriod,
          standardDeviations,
          result.source.id,
        ),
      );

      return JSON.stringify({
        ticker,
        bollingerBands,
        sourceIds: [result.source.id],
        limitation:
          'Bollinger Bands describe historical price dispersion around a moving average; touching or crossing a band is not an automatic reversal signal.',
      });
    },
    {
      name: 'calculate_volatility_indicators',
      description:
        'Calculate close-only Bollinger Bands for a U.S. stock and compare the latest close with the upper, middle, and lower bands. Defaults to a 20-session SMA with two population standard deviations.',
      schema: z.object({
        ticker: AssistantTickerSchema,
        bollingerPeriod: z.number().int().min(2).max(100).default(20),
        standardDeviations: z.number().min(0.5).max(4).default(2),
      }),
    },
  );

  return [calculateMovingAverages, calculateMomentumIndicators, calculateVolatilityIndicators];
}
