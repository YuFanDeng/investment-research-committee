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

  it('derives recent filing metadata from the checked-in fixture', async () => {
    const result = await new FixtureSecEdgarClient().getRecentFilings('AAPL', ['10-K', '10-Q'], 3);

    expect(result.filings).toHaveLength(3);
    expect(result.filings[0].filingDate >= result.filings[1].filingDate).toBe(true);
    expect(result.filings.every((filing) => filing.source.url.includes('sec.gov'))).toBe(true);
  });
});
