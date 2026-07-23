import type { Fundamentals } from '../schemas.js';
import type { MarketDataResult } from './massive.js';
import type { SecFundamentals } from './sec-edgar.js';

const MOCK_PEERS = ['MSFT', 'GOOGL', 'AMZN'];

function mockSource(
  id: string,
  title: string,
  url: string,
  sourceType: 'sec_filing' | 'market_data',
) {
  return {
    id,
    title,
    url,
    sourceType,
    retrievedAt: new Date().toISOString(),
  } as const;
}

function mockFundamentals(ticker: string): Fundamentals {
  const seed = ticker.split('').reduce((total, character) => total + character.charCodeAt(0), 0);
  const revenueUsd = (90 + (seed % 40)) * 1_000_000_000;

  return {
    fiscalYear: 2025,
    revenueUsd,
    netIncomeUsd: revenueUsd * 0.2,
    operatingCashFlowUsd: revenueUsd * 0.25,
  };
}

export class MockSecEdgarClient {
  async getFundamentals(ticker: string): Promise<SecFundamentals> {
    return {
      companyName: `${ticker.toUpperCase()} Mock Corporation`,
      fundamentals: mockFundamentals(ticker),
      source: mockSource(
        `mock-sec-${ticker.toUpperCase()}`,
        `${ticker.toUpperCase()} — mock SEC fundamentals`,
        'https://example.com/mock/sec-fundamentals',
        'sec_filing',
      ),
    };
  }
}

export class MockMassiveClient {
  async getMarketSnapshot(ticker: string): Promise<MarketDataResult> {
    const normalizedTicker = ticker.toUpperCase();
    const retrievedAt = new Date().toISOString();
    const currentPrice = 100;

    return {
      snapshot: {
        currentPrice,
        previousClose: currentPrice,
        historicalCloses: Array.from({ length: 20 }, (_, index) => ({
          date: new Date(Date.now() - (19 - index) * 86_400_000).toISOString().slice(0, 10),
          close: currentPrice - (19 - index) * 0.5,
        })),
        marketCap: 1_000_000_000_000,
        currency: 'USD',
        adjusted: true,
        retrievedAt,
        sourceId: `mock-market-${normalizedTicker}`,
        peers: MOCK_PEERS.map((peerTicker, index) => ({
          ticker: peerTicker,
          name: `${peerTicker} Mock Corporation`,
          marketCap: (900 - index * 100) * 1_000_000_000,
          currency: 'USD',
        })),
      },
      source: mockSource(
        `mock-market-${normalizedTicker}`,
        `${normalizedTicker} — mock market data`,
        'https://example.com/mock/market-data',
        'market_data',
      ),
    };
  }
}
