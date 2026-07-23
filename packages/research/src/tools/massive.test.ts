import { describe, expect, it } from 'vitest';

import { MassiveClient } from './massive.js';

describe('MassiveClient', () => {
  it('normalizes previous price, history, and ticker metadata', async () => {
    const requests: string[] = [];
    const client = new MassiveClient({
      apiKey: 'test-key',
      baseUrl: 'https://api.massive.test',
      fetcher: async (input) => {
        const url = String(input);
        requests.push(url);

        if (url.includes('/prev')) {
          return new Response(JSON.stringify({ results: [{ c: 210.5 }] }), { status: 200 });
        }

        if (url.includes('/range/')) {
          return new Response(
            JSON.stringify({
              results: [
                { c: 200, t: Date.parse('2026-01-02T00:00:00.000Z') },
                { c: 210.5, t: Date.parse('2026-01-03T00:00:00.000Z') },
              ],
            }),
            { status: 200 },
          );
        }

        if (url.includes('/related-companies/')) {
          return new Response(JSON.stringify({ results: [{ ticker: 'MSFT' }] }), { status: 200 });
        }

        return new Response(
          JSON.stringify({
            results: { name: 'Microsoft', market_cap: 3_000_000_000_000, currency_name: 'usd' },
          }),
          { status: 200 },
        );
      },
    });

    const result = await client.getMarketSnapshot('AAPL');

    expect(requests).toHaveLength(5);
    expect(requests.every((request) => request.includes('apiKey=test-key'))).toBe(true);
    expect(result.snapshot.currentPrice).toBe(210.5);
    expect(result.snapshot.historicalCloses).toEqual([
      { date: '2026-01-02', close: 200 },
      { date: '2026-01-03', close: 210.5 },
    ]);
    expect(result.snapshot.marketCap).toBe(3_000_000_000_000);
    expect(result.snapshot.peers).toEqual([
      {
        ticker: 'MSFT',
        name: 'Microsoft',
        marketCap: 3_000_000_000_000,
        currency: 'usd',
      },
    ]);
    expect(result.source.sourceType).toBe('market_data');
  });
});
