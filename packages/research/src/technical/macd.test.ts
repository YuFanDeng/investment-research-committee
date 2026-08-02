import { describe, expect, it } from 'vitest';

import { calculateMacd, macdSeries } from './macd.js';

const settings = { fastPeriod: 2, slowPeriod: 3, signalPeriod: 2 };

describe('MACD', () => {
  it('derives MACD, signal, and histogram series from seeded EMAs', () => {
    expect(macdSeries([1, 2, 3, 4, 5], settings)).toEqual([
      { macd: null, signal: null, histogram: null },
      { macd: null, signal: null, histogram: null },
      { macd: 0.5, signal: null, histogram: null },
      { macd: 0.5, signal: 0.5, histogram: 0 },
      { macd: 0.5, signal: 0.5, histogram: 0 },
    ]);
  });

  it('returns a compact latest-state interpretation', () => {
    const bars = [1, 2, 3, 4, 5].map((close, index) => ({
      date: `2026-07-0${index + 1}`,
      close,
    }));

    expect(calculateMacd(bars, settings)).toMatchObject({
      status: 'available',
      macd: 0.5,
      signal: 0.5,
      histogram: 0,
      signalPosition: 'equal',
      zeroPosition: 'above',
    });
  });
});
