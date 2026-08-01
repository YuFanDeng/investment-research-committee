import { describe, expect, it } from 'vitest';

import { calculateSimpleMovingAverages } from './moving-average.js';

function bar(day: number, close: number) {
  return { date: `2026-07-${String(day).padStart(2, '0')}`, close };
}

describe('simple moving averages', () => {
  it('sorts observations and calculates each supported period from the latest closes', () => {
    const bars = Array.from({ length: 10 }, (_, index) => bar(index + 1, index + 1)).reverse();

    expect(calculateSimpleMovingAverages(bars, [5, 10, 20])).toEqual({
      asOf: '2026-07-10',
      latestClose: 10,
      observationCount: 10,
      movingAverages: [
        {
          period: 5,
          status: 'available',
          value: 8,
          priceDifferencePercent: 25,
          pricePosition: 'above',
        },
        {
          period: 10,
          status: 'available',
          value: 5.5,
          priceDifferencePercent: 81.82,
          pricePosition: 'above',
        },
        {
          period: 20,
          status: 'insufficient_data',
          requiredObservations: 20,
          availableObservations: 10,
        },
      ],
    });
  });

  it('reports when the latest close is below its moving average', () => {
    const result = calculateSimpleMovingAverages(
      [bar(1, 10), bar(2, 9), bar(3, 8), bar(4, 7), bar(5, 6)],
      [5],
    );

    expect(result.movingAverages[0]).toMatchObject({
      value: 8,
      priceDifferencePercent: -25,
      pricePosition: 'below',
    });
  });

  it('supports custom periods and normalizes duplicates into ascending order', () => {
    const bars = Array.from({ length: 120 }, (_, index) => ({
      date: new Date(Date.UTC(2026, 0, index + 1)).toISOString().slice(0, 10),
      close: 42,
    }));
    const result = calculateSimpleMovingAverages(bars, [120, 5, 120]);

    expect(result.movingAverages).toEqual([
      {
        period: 5,
        status: 'available',
        value: 42,
        priceDifferencePercent: 0,
        pricePosition: 'equal',
      },
      {
        period: 120,
        status: 'available',
        value: 42,
        priceDifferencePercent: 0,
        pricePosition: 'equal',
      },
    ]);
  });
});
