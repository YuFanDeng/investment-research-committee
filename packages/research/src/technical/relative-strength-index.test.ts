import { describe, expect, it } from 'vitest';

import {
  calculateRelativeStrengthIndex,
  relativeStrengthIndexSeries,
} from './relative-strength-index.js';

function bars(closes: number[]) {
  return closes.map((close, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, '0')}`,
    close,
  }));
}

describe('relative strength index', () => {
  it('uses Wilder smoothing and handles one-directional price changes', () => {
    expect(relativeStrengthIndexSeries([1, 2, 3, 4, 5], 3)).toEqual([null, null, null, 100, 100]);
    expect(calculateRelativeStrengthIndex(bars([5, 4, 3, 2, 1]), 3)).toMatchObject({
      status: 'available',
      value: 0,
      zone: 'below_30',
    });
    expect(calculateRelativeStrengthIndex(bars([2, 2, 2, 2, 2]), 3)).toMatchObject({
      value: 50,
      zone: 'neutral',
    });
  });

  it('requires one more close than the RSI period', () => {
    expect(calculateRelativeStrengthIndex(bars([1, 2, 3]), 3)).toEqual({
      period: 3,
      status: 'insufficient_data',
      requiredObservations: 4,
      availableObservations: 3,
    });
  });
});
