import { describe, expect, it } from 'vitest';

import {
  calculateExponentialMovingAverages,
  exponentialMovingAverageSeries,
} from './exponential-moving-average.js';

const bars = [1, 2, 3, 4, 5].map((close, index) => ({
  date: `2026-07-0${index + 1}`,
  close,
}));

describe('exponential moving averages', () => {
  it('seeds with an SMA and then applies exponential weighting', () => {
    expect(exponentialMovingAverageSeries([1, 2, 3, 4, 5], 3)).toEqual([null, null, 2, 3, 4]);
    expect(calculateExponentialMovingAverages(bars, [3]).movingAverages).toEqual([
      {
        period: 3,
        status: 'available',
        value: 4,
        priceDifferencePercent: 25,
        pricePosition: 'above',
      },
    ]);
  });

  it('reports insufficient history instead of manufacturing a value', () => {
    expect(calculateExponentialMovingAverages(bars, [10]).movingAverages[0]).toEqual({
      period: 10,
      status: 'insufficient_data',
      requiredObservations: 10,
      availableObservations: 5,
    });
  });
});
