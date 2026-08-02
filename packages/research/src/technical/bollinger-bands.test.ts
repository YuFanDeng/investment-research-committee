import { describe, expect, it } from 'vitest';

import { bollingerBandSeries, calculateBollingerBands } from './bollinger-bands.js';

describe('Bollinger Bands', () => {
  it('uses a population standard deviation around the rolling SMA', () => {
    expect(bollingerBandSeries([1, 2, 3], 3, 2)).toEqual([
      { middle: null, upper: null, lower: null },
      { middle: null, upper: null, lower: null },
      { middle: 2, upper: 3.63, lower: 0.37 },
    ]);
  });

  it('reports the latest band width and price position', () => {
    const bars = [1, 2, 3].map((close, index) => ({
      date: `2026-07-0${index + 1}`,
      close,
    }));

    expect(calculateBollingerBands(bars, 3, 2)).toMatchObject({
      status: 'available',
      middle: 2,
      upper: 3.63,
      lower: 0.37,
      bandwidthPercent: 163,
      percentB: 0.81,
      pricePosition: 'within_bands',
    });
  });
});
