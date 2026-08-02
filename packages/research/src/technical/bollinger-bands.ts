import type { MarketBar } from '../schemas.js';
import { chronologicalBars, roundIndicator } from './indicator-utils.js';

export type BollingerBandPoint = {
  middle: number | null;
  upper: number | null;
  lower: number | null;
};

export function bollingerBandSeries(values: number[], period: number, standardDeviations: number) {
  return values.map<BollingerBandPoint>((_, index) => {
    if (index + 1 < period) return { middle: null, upper: null, lower: null };
    const window = values.slice(index + 1 - period, index + 1);
    const middle = window.reduce((sum, value) => sum + value, 0) / period;
    const variance = window.reduce((sum, value) => sum + Math.pow(value - middle, 2), 0) / period;
    const deviation = Math.sqrt(variance) * standardDeviations;
    return {
      middle: roundIndicator(middle),
      upper: roundIndicator(middle + deviation),
      lower: roundIndicator(middle - deviation),
    };
  });
}

export function calculateBollingerBands(bars: MarketBar[], period = 20, standardDeviations = 2) {
  const sortedBars = chronologicalBars(bars);
  const latestBar = sortedBars.at(-1);
  if (!latestBar) throw new Error('At least one closing-price observation is required.');

  const latestBands = bollingerBandSeries(
    sortedBars.map((bar) => bar.close),
    period,
    standardDeviations,
  ).at(-1);
  if (
    !latestBands ||
    latestBands.middle === null ||
    latestBands.upper === null ||
    latestBands.lower === null
  ) {
    return {
      period,
      standardDeviations,
      status: 'insufficient_data' as const,
      requiredObservations: period,
      availableObservations: sortedBars.length,
    };
  }

  const width = latestBands.upper - latestBands.lower;
  return {
    period,
    standardDeviations,
    status: 'available' as const,
    asOf: latestBar.date,
    latestClose: latestBar.close,
    ...latestBands,
    bandwidthPercent: roundIndicator((width / latestBands.middle) * 100),
    percentB: width === 0 ? null : roundIndicator((latestBar.close - latestBands.lower) / width),
    pricePosition:
      latestBar.close > latestBands.upper
        ? ('above_upper_band' as const)
        : latestBar.close < latestBands.lower
          ? ('below_lower_band' as const)
          : ('within_bands' as const),
  };
}
