import type { MarketBar } from '../schemas.js';
import { chronologicalBars, roundIndicator } from './indicator-utils.js';

function rsiFromAverages(averageGain: number, averageLoss: number) {
  if (averageGain === 0 && averageLoss === 0) return 50;
  if (averageLoss === 0) return 100;
  if (averageGain === 0) return 0;
  const relativeStrength = averageGain / averageLoss;
  return 100 - 100 / (1 + relativeStrength);
}

export function relativeStrengthIndexSeries(values: number[], period: number) {
  const series: Array<number | null> = Array(values.length).fill(null);
  if (values.length <= period) return series;

  let averageGain = 0;
  let averageLoss = 0;
  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];
    averageGain += Math.max(change, 0);
    averageLoss += Math.max(-change, 0);
  }
  averageGain /= period;
  averageLoss /= period;
  series[period] = roundIndicator(rsiFromAverages(averageGain, averageLoss));

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = Math.max(change, 0);
    const loss = Math.max(-change, 0);
    averageGain = (averageGain * (period - 1) + gain) / period;
    averageLoss = (averageLoss * (period - 1) + loss) / period;
    series[index] = roundIndicator(rsiFromAverages(averageGain, averageLoss));
  }

  return series;
}

export function calculateRelativeStrengthIndex(bars: MarketBar[], period = 14) {
  const sortedBars = chronologicalBars(bars);
  const latestBar = sortedBars.at(-1);
  if (!latestBar) throw new Error('At least one closing-price observation is required.');

  const series = relativeStrengthIndexSeries(
    sortedBars.map((bar) => bar.close),
    period,
  );
  const value = series.at(-1);
  if (value === null || value === undefined) {
    return {
      period,
      status: 'insufficient_data' as const,
      requiredObservations: period + 1,
      availableObservations: sortedBars.length,
    };
  }

  return {
    period,
    status: 'available' as const,
    asOf: latestBar.date,
    value,
    zone:
      value > 70
        ? ('above_70' as const)
        : value < 30
          ? ('below_30' as const)
          : ('neutral' as const),
  };
}
