import { describe, expect, it } from 'vitest';

import { FixtureSecEdgarClient } from './mock-data.js';

describe('FixtureSecEdgarClient', () => {
  it('parses the checked-in AAPL Company Facts response', async () => {
    const result = await new FixtureSecEdgarClient().getFundamentals('AAPL');

    expect(result.companyName).toBe('Apple Inc.');
    expect(result.fundamentals.revenueUsd).toBeGreaterThan(0);
    expect(result.source.id).toBe('fixture-sec-company-facts-aapl');
  });

  it('rejects tickers without a checked-in fixture', async () => {
    await expect(new FixtureSecEdgarClient().getFundamentals('MSFT')).rejects.toThrow(
      'No SEC fixture is available',
    );
  });
});
