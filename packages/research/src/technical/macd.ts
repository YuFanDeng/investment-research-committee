import type { MarketBar } from '../schemas.js';
import { exponentialMovingAverageSeries } from './exponential-moving-average.js';
import { chronologicalBars, roundIndicator } from './indicator-utils.js';

export type MacdSettings = {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
};

export type MacdPoint = {
  macd: number | null;
  signal: number | null;
  histogram: number | null;
};

export function macdSeries(values: number[], settings: MacdSettings): MacdPoint[] {
  const fast = exponentialMovingAverageSeries(values, settings.fastPeriod);
  const slow = exponentialMovingAverageSeries(values, settings.slowPeriod);
  const macd = values.map((_, index) =>
    fast[index] === null || slow[index] === null ? null : fast[index]! - slow[index]!,
  );
  const availableMacd = macd.filter((value): value is number => value !== null);
  const availableSignal = exponentialMovingAverageSeries(availableMacd, settings.signalPeriod);
  const firstMacdIndex = macd.findIndex((value) => value !== null);

  return macd.map((macdValue, index) => {
    const signalIndex = index - firstMacdIndex;
    const signalValue = signalIndex >= 0 ? availableSignal[signalIndex] : null;
    return {
      macd: macdValue === null ? null : roundIndicator(macdValue),
      signal:
        signalValue === null || signalValue === undefined ? null : roundIndicator(signalValue),
      histogram:
        macdValue === null || signalValue === null || signalValue === undefined
          ? null
          : roundIndicator(macdValue - signalValue),
    };
  });
}

function latestCrossover(points: MacdPoint[], bars: MarketBar[]) {
  for (let index = points.length - 1; index > 0; index -= 1) {
    const current = points[index];
    const previous = points[index - 1];
    if (
      current.macd === null ||
      current.signal === null ||
      previous.macd === null ||
      previous.signal === null
    ) {
      continue;
    }
    const currentDifference = current.macd - current.signal;
    const previousDifference = previous.macd - previous.signal;
    if (previousDifference <= 0 && currentDifference > 0) {
      return { date: bars[index].date, direction: 'bullish' as const };
    }
    if (previousDifference >= 0 && currentDifference < 0) {
      return { date: bars[index].date, direction: 'bearish' as const };
    }
  }
  return undefined;
}

export function calculateMacd(bars: MarketBar[], settings: MacdSettings) {
  const sortedBars = chronologicalBars(bars);
  const latestBar = sortedBars.at(-1);
  if (!latestBar) throw new Error('At least one closing-price observation is required.');

  const points = macdSeries(
    sortedBars.map((bar) => bar.close),
    settings,
  );
  const latest = points.at(-1);
  if (!latest || latest.macd === null || latest.signal === null || latest.histogram === null) {
    return {
      ...settings,
      status: 'insufficient_data' as const,
      requiredObservations: settings.slowPeriod + settings.signalPeriod - 1,
      availableObservations: sortedBars.length,
    };
  }

  return {
    ...settings,
    status: 'available' as const,
    asOf: latestBar.date,
    ...latest,
    signalPosition:
      latest.macd > latest.signal
        ? ('above' as const)
        : latest.macd < latest.signal
          ? ('below' as const)
          : ('equal' as const),
    zeroPosition:
      latest.macd > 0
        ? ('above' as const)
        : latest.macd < 0
          ? ('below' as const)
          : ('equal' as const),
    latestCrossover: latestCrossover(points, sortedBars),
  };
}
