import type { MarketBar } from '../schemas.js';

export const COMMON_MOVING_AVERAGE_PERIODS = [5, 10, 20, 50, 100, 200] as const;
export const MIN_MOVING_AVERAGE_PERIOD = 2;
export const MAX_MOVING_AVERAGE_PERIOD = 250;

export type MovingAveragePeriod = number;

type AvailableMovingAverage = {
  period: MovingAveragePeriod;
  status: 'available';
  value: number;
  priceDifferencePercent: number;
  pricePosition: 'above' | 'below' | 'equal';
};

type UnavailableMovingAverage = {
  period: MovingAveragePeriod;
  status: 'insufficient_data';
  requiredObservations: number;
  availableObservations: number;
};

export type MovingAverage = AvailableMovingAverage | UnavailableMovingAverage;

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function pricePosition(price: number, movingAverage: number) {
  if (price > movingAverage) return 'above' as const;
  if (price < movingAverage) return 'below' as const;
  return 'equal' as const;
}

export function calculateSimpleMovingAverages(bars: MarketBar[], periods: MovingAveragePeriod[]) {
  const chronologicalBars = [...bars].sort((left, right) => left.date.localeCompare(right.date));
  const latestBar = chronologicalBars.at(-1);
  if (!latestBar) throw new Error('At least one closing-price observation is required.');

  const normalizedPeriods = [...new Set(periods)].sort((left, right) => left - right);
  const movingAverages: MovingAverage[] = normalizedPeriods.map((period) => {
    if (chronologicalBars.length < period) {
      return {
        period,
        status: 'insufficient_data',
        requiredObservations: period,
        availableObservations: chronologicalBars.length,
      };
    }

    const observations = chronologicalBars.slice(-period);
    const average = observations.reduce((sum, bar) => sum + bar.close, 0) / period;

    return {
      period,
      status: 'available',
      value: round(average),
      priceDifferencePercent: round(((latestBar.close - average) / average) * 100),
      pricePosition: pricePosition(latestBar.close, average),
    };
  });

  return {
    asOf: latestBar.date,
    latestClose: latestBar.close,
    observationCount: chronologicalBars.length,
    movingAverages,
  };
}
