import type { MarketBar } from '../schemas.js';
import { bollingerBandSeries } from '../technical/bollinger-bands.js';
import { exponentialMovingAverageSeries } from '../technical/exponential-moving-average.js';
import { chronologicalBars, roundIndicator } from '../technical/indicator-utils.js';
import { macdSeries, type MacdPoint, type MacdSettings } from '../technical/macd.js';
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

function movingAverageGroups(averageTypes: MovingAverageType[], seriesKeys: string[]) {
  if (averageTypes.length < 2) return undefined;

  return [
    {
      key: 'sma',
      label: 'SMA',
      seriesKeys: ['close', ...seriesKeys.filter((key) => key.startsWith('sma'))],
    },
    {
      key: 'ema',
      label: 'EMA',
      seriesKeys: ['close', ...seriesKeys.filter((key) => key.startsWith('ema'))],
    },
    { key: 'compare', label: 'Compare all', seriesKeys: ['close', ...seriesKeys] },
  ];
}

function latestAvailableValue(values: Array<number | null>) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null) return value;
  }
  return undefined;
}

function latestCompleteMacdPoint(points: MacdPoint[]) {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];
    if (point.macd !== null && point.signal !== null && point.histogram !== null) {
      return { macd: point.macd, signal: point.signal, histogram: point.histogram };
    }
  }
  return undefined;
}

function macdDescription(settings: MacdSettings, latestPoint?: { macd: number; signal: number }) {
  const settingsLabel = `${settings.fastPeriod}/${settings.slowPeriod}/${settings.signalPeriod}`;
  if (!latestPoint) return `Not enough price history for ${settingsLabel} MACD`;

  const signalPosition =
    latestPoint.macd > latestPoint.signal
      ? 'above'
      : latestPoint.macd < latestPoint.signal
        ? 'below'
        : 'at';
  return `${settingsLabel} MACD is ${signalPosition} its signal line`;
}

function bollingerPosition(
  close: number | undefined,
  bands: { upper: number | null; lower: number | null } | undefined,
) {
  if (close === undefined || bands?.upper === null || bands?.lower === null || !bands) {
    return undefined;
  }
  if (close > bands.upper) return 'above the upper band';
  if (close < bands.lower) return 'below the lower band';
  return 'within the bands';
}

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
  const averageKeys = averages.map((average) => average.key);
  const seriesGroups = movingAverageGroups(averageTypes, averageKeys);

  return {
    type: 'line-chart',
    id: `price-history-${ticker}`,
    title: `${ticker} price and moving averages`,
    description: `${periods.join(', ')}-session ${averageTypes.map((type) => type.toUpperCase()).join(' and ')} trend overlays on adjusted closes`,
    sourceIds: [sourceId],
    technicalDomain: 'trend',
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
    seriesGroups,
    defaultSeriesGroup: seriesGroups?.[0].key,
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
  const latestValue = latestAvailableValue(values);
  return {
    type: 'line-chart',
    id: `rsi-${ticker}-${period}`,
    title: `${ticker} ${period}-day RSI`,
    description:
      latestValue === undefined
        ? 'Not enough price history to calculate this RSI period'
        : `Latest RSI is ${latestValue}; 30 and 70 are conventional context levels`,
    sourceIds: [sourceId],
    technicalDomain: 'momentum',
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
  const latestPoint = latestCompleteMacdPoint(points);
  return {
    type: 'line-chart',
    id: `macd-${ticker}-${settings.fastPeriod}-${settings.slowPeriod}-${settings.signalPeriod}`,
    title: `${ticker} MACD`,
    description: macdDescription(settings, latestPoint),
    sourceIds: [sourceId],
    technicalDomain: 'momentum',
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
  const latestBar = bars.at(-1);
  const latestBands = bands.at(-1);
  const latestPosition = bollingerPosition(latestBar?.close, latestBands);
  return {
    type: 'line-chart',
    id: `bollinger-${ticker}-${period}-${standardDeviations}`,
    title: `${ticker} price and Bollinger Bands`,
    description: latestPosition
      ? `Latest close is ${latestPosition}; bands use a ${period}-session SMA and ±${standardDeviations} standard deviations`
      : `Not enough price history for ${period}-session Bollinger Bands`,
    sourceIds: [sourceId],
    technicalDomain: 'volatility',
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
