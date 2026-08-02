import type { MarketBar } from '../schemas.js';
import { chronologicalBars, pricePosition, roundIndicator } from './indicator-utils.js';
import type { MovingAverage, MovingAveragePeriod } from './moving-average.js';

export function exponentialMovingAverageSeries(values: number[], period: number) {
  const series: Array<number | null> = Array(values.length).fill(null);
  if (values.length < period) return series;

  const seed = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  const multiplier = 2 / (period + 1);
  series[period - 1] = seed;

  for (let index = period; index < values.length; index += 1) {
    const previousAverage = series[index - 1];
    if (previousAverage === null) continue;
    series[index] = (values[index] - previousAverage) * multiplier + previousAverage;
  }

  return series;
}

export function calculateExponentialMovingAverages(
  bars: MarketBar[],
  periods: MovingAveragePeriod[],
) {
  const sortedBars = chronologicalBars(bars);
  const latestBar = sortedBars.at(-1);
  if (!latestBar) throw new Error('At least one closing-price observation is required.');

  const closes = sortedBars.map((bar) => bar.close);
  const normalizedPeriods = [...new Set(periods)].sort((left, right) => left - right);
  const movingAverages: MovingAverage[] = normalizedPeriods.map((period) => {
    const latestAverage = exponentialMovingAverageSeries(closes, period).at(-1);
    if (latestAverage === null || latestAverage === undefined) {
      return {
        period,
        status: 'insufficient_data',
        requiredObservations: period,
        availableObservations: sortedBars.length,
      };
    }

    return {
      period,
      status: 'available',
      value: roundIndicator(latestAverage),
      priceDifferencePercent: roundIndicator(
        ((latestBar.close - latestAverage) / latestAverage) * 100,
      ),
      pricePosition: pricePosition(latestBar.close, latestAverage),
    };
  });

  return {
    asOf: latestBar.date,
    latestClose: latestBar.close,
    observationCount: sortedBars.length,
    movingAverages,
  };
}
