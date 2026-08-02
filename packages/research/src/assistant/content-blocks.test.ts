import { describe, expect, it } from 'vitest';

import { createPriceHistoryBlock, mergeContentBlock } from './content-block-builders.js';
import { ASSISTANT_CONTENT_VERSION, AssistantContentEnvelopeSchema } from './content-blocks.js';
import { createMovingAverageBlock } from './technical-content-blocks.js';

describe('assistant content contract', () => {
  it('validates a versioned mixture of narrative and visualization blocks', () => {
    const result = AssistantContentEnvelopeSchema.parse({
      version: ASSISTANT_CONTENT_VERSION,
      blocks: [
        { type: 'markdown', id: 'answer', content: '**Takeaway:** Revenue increased.' },
        {
          type: 'bar-chart',
          id: 'quarterly-revenue-TEST',
          title: 'Quarterly revenue',
          xKey: 'quarter',
          series: [{ key: 'revenue', label: 'Revenue' }],
          data: [{ quarter: '2026 Q1', revenue: 100 }],
        },
      ],
    });

    expect(result.version).toBe(1);
    expect(result.blocks).toHaveLength(2);
  });

  it('rejects invalid chart values before they cross the API boundary', () => {
    expect(() =>
      AssistantContentEnvelopeSchema.parse({
        version: ASSISTANT_CONTENT_VERSION,
        blocks: [
          {
            type: 'line-chart',
            id: 'unsafe-chart',
            title: 'Unsafe chart',
            xKey: 'date',
            series: [{ key: 'close', label: 'Close' }],
            data: [{ date: '2026-08-01', close: { nested: 'not allowed' } }],
          },
        ],
      }),
    ).toThrow();
  });

  it('keeps moving-average series when price history arrives later', () => {
    const bars = [
      { date: '2026-07-01', close: 10 },
      { date: '2026-07-02', close: 12 },
      { date: '2026-07-03', close: 14 },
    ];
    const movingAverage = createMovingAverageBlock('TEST', bars, [2], ['sma'], 'market-test');
    const priceHistory = createPriceHistoryBlock('TEST', bars, 'market-test');
    const merged = mergeContentBlock(movingAverage, priceHistory);

    expect(merged).toMatchObject({
      type: 'line-chart',
      title: 'TEST price and moving averages',
      series: [{ key: 'close' }, { key: 'sma2' }],
    });
  });
});
