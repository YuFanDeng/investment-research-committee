import type { MarketBar } from '../schemas.js';
import { bollingerBandSeries } from '../technical/bollinger-bands.js';
import { exponentialMovingAverageSeries } from '../technical/exponential-moving-average.js';
import { chronologicalBars, roundIndicator } from '../technical/indicator-utils.js';
import { macdSeries, type MacdSettings } from '../technical/macd.js';
import { relativeStrengthIndexSeries } from '../technical/relative-strength-index.js';
import type { LineChartContentBlock } from './content-blocks.js';

export type MovingAverageType = 'sma' | 'ema';

const TECHNICAL_COLORS = [
  '#4f46e5',
  '#0f9f6e',
  '#d97706',
  '#dc5a65',
  '#7c3aed',
  '#0284c7',
  '#db2777',
];

function simpleMovingAverageSeries(values: number[], period: number) {
  let rollingTotal = 0;
  return values.map((value, index) => {
    rollingTotal += value;
    if (index >= period) rollingTotal -= values[index - period];
    return index + 1 >= period ? roundIndicator(rollingTotal / period) : null;
  });
}

export function createMovingAverageBlock(
  ticker: string,
  rawBars: MarketBar[],
  periods: number[],
  averageTypes: MovingAverageType[],
  sourceId: string,
): LineChartContentBlock {
  const bars = chronologicalBars(rawBars);
  const closes = bars.map((bar) => bar.close);
  const averages = averageTypes.flatMap((averageType) =>
    periods.map((period) => ({
      key: `${averageType}${period}`,
      label: `${period}-day ${averageType.toUpperCase()}`,
      values:
        averageType === 'sma'
          ? simpleMovingAverageSeries(closes, period)
          : exponentialMovingAverageSeries(closes, period).map((value) =>
              value === null ? null : roundIndicator(value),
            ),
    })),
  );

  return {
    type: 'line-chart',
    id: `price-history-${ticker}`,
    title: `${ticker} price and moving averages`,
    description: 'Adjusted daily closes with deterministic moving-average overlays',
    sourceIds: [sourceId],
    xKey: 'date',
    valueFormat: 'currency',
    series: [
      { key: 'close', label: 'Close', color: TECHNICAL_COLORS[0] },
      ...averages.map((average, index) => ({
        key: average.key,
        label: average.label,
        color: TECHNICAL_COLORS[(index + 1) % TECHNICAL_COLORS.length],
      })),
    ],
    data: bars.map((bar, index) => ({
      date: bar.date,
      close: bar.close,
      ...Object.fromEntries(
        averages.map((average) => [average.key, average.values[index] ?? null]),
      ),
    })),
  };
}

export function createRsiBlock(
  ticker: string,
  rawBars: MarketBar[],
  period: number,
  sourceId: string,
): LineChartContentBlock {
  const bars = chronologicalBars(rawBars);
  const values = relativeStrengthIndexSeries(
    bars.map((bar) => bar.close),
    period,
  );
  return {
    type: 'line-chart',
    id: `rsi-${ticker}-${period}`,
    title: `${ticker} ${period}-day RSI`,
    description: 'Wilder-smoothed relative strength index with conventional reference levels',
    sourceIds: [sourceId],
    xKey: 'date',
    valueFormat: 'number',
    referenceLines: [
      { value: 70, label: '70', color: '#dc5a65' },
      { value: 30, label: '30', color: '#0f9f6e' },
    ],
    series: [{ key: 'rsi', label: `RSI ${period}`, color: '#7c3aed' }],
    data: bars.map((bar, index) => ({ date: bar.date, rsi: values[index] ?? null })),
  };
}

export function createMacdBlock(
  ticker: string,
  rawBars: MarketBar[],
  settings: MacdSettings,
  sourceId: string,
): LineChartContentBlock {
  const bars = chronologicalBars(rawBars);
  const points = macdSeries(
    bars.map((bar) => bar.close),
    settings,
  );
  return {
    type: 'line-chart',
    id: `macd-${ticker}-${settings.fastPeriod}-${settings.slowPeriod}-${settings.signalPeriod}`,
    title: `${ticker} MACD`,
    description: `${settings.fastPeriod}/${settings.slowPeriod}/${settings.signalPeriod} MACD, signal, and histogram series`,
    sourceIds: [sourceId],
    xKey: 'date',
    valueFormat: 'number',
    referenceLines: [{ value: 0, label: 'Zero', color: '#94a3b8' }],
    series: [
      { key: 'macd', label: 'MACD', color: '#4f46e5' },
      { key: 'signal', label: 'Signal', color: '#d97706' },
      { key: 'histogram', label: 'Histogram', color: '#0f9f6e' },
    ],
    data: bars.map((bar, index) => ({ date: bar.date, ...points[index] })),
  };
}

export function createBollingerBandBlock(
  ticker: string,
  rawBars: MarketBar[],
  period: number,
  standardDeviations: number,
  sourceId: string,
): LineChartContentBlock {
  const bars = chronologicalBars(rawBars);
  const bands = bollingerBandSeries(
    bars.map((bar) => bar.close),
    period,
    standardDeviations,
  );
  return {
    type: 'line-chart',
    id: `price-history-${ticker}`,
    title: `${ticker} price and Bollinger Bands`,
    description: `${period}-session SMA with ±${standardDeviations} population standard deviations`,
    sourceIds: [sourceId],
    xKey: 'date',
    valueFormat: 'currency',
    series: [
      { key: 'close', label: 'Close', color: TECHNICAL_COLORS[0] },
      { key: 'bollingerUpper', label: 'Upper band', color: '#dc5a65' },
      { key: 'bollingerMiddle', label: `${period}-day SMA`, color: '#d97706' },
      { key: 'bollingerLower', label: 'Lower band', color: '#0f9f6e' },
    ],
    data: bars.map((bar, index) => ({
      date: bar.date,
      close: bar.close,
      bollingerUpper: bands[index].upper,
      bollingerMiddle: bands[index].middle,
      bollingerLower: bands[index].lower,
    })),
  };
}
