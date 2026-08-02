import type { Source } from '../../schemas.js';
import type { MassiveForm4Client } from '../../tools/massive-form4.js';
import type { MassiveClient } from '../../tools/massive.js';
import type { SecEdgarClient } from '../../tools/sec-edgar.js';

export type SecToolClient = Pick<
  SecEdgarClient,
  'getFundamentals' | 'getQuarterlyFundamentals' | 'getRecentFilings'
>;
export type MarketToolClient = Pick<MassiveClient, 'getMarketSnapshot' | 'getPriceHistory'>;
export type OwnershipToolClient = Pick<MassiveForm4Client, 'getTransactions'>;

export type CreateResearchToolContextOptions = {
  secClient: SecToolClient;
  marketClient: MarketToolClient;
  ownershipClient: OwnershipToolClient;
};

export function createResearchToolContext(options: CreateResearchToolContextOptions) {
  const sources = new Map<string, Source>();
  const fundamentalsByTicker = new Map<string, ReturnType<SecToolClient['getFundamentals']>>();
  const quarterlyFundamentalsByTickerAndPeriods = new Map<
    string,
    ReturnType<SecToolClient['getQuarterlyFundamentals']>
  >();
  const marketSnapshotsByTicker = new Map<
    string,
    ReturnType<MarketToolClient['getMarketSnapshot']>
  >();
  const priceHistoryByTickerAndRange = new Map<
    string,
    ReturnType<MarketToolClient['getPriceHistory']>
  >();
  const insiderTransactionsByQuery = new Map<
    string,
    ReturnType<OwnershipToolClient['getTransactions']>
  >();

  return {
    secClient: options.secClient,
    marketClient: options.marketClient,
    ownershipClient: options.ownershipClient,
    collectSource(source: Source) {
      sources.set(source.id, source);
    },
    getFundamentals(ticker: string) {
      const normalizedTicker = ticker.toUpperCase();
      const existingRequest = fundamentalsByTicker.get(normalizedTicker);
      if (existingRequest) return existingRequest;

      const request = options.secClient.getFundamentals(normalizedTicker);
      fundamentalsByTicker.set(normalizedTicker, request);
      return request;
    },
    getQuarterlyFundamentals(ticker: string, periods: number) {
      const normalizedTicker = ticker.toUpperCase();
      const cacheKey = `${normalizedTicker}:${periods}`;
      const existingRequest = quarterlyFundamentalsByTickerAndPeriods.get(cacheKey);
      if (existingRequest) return existingRequest;

      const request = options.secClient.getQuarterlyFundamentals(normalizedTicker, periods);
      quarterlyFundamentalsByTickerAndPeriods.set(cacheKey, request);
      return request;
    },
    getMarketSnapshot(ticker: string) {
      const normalizedTicker = ticker.toUpperCase();
      const existingRequest = marketSnapshotsByTicker.get(normalizedTicker);
      if (existingRequest) return existingRequest;

      const request = options.marketClient.getMarketSnapshot(normalizedTicker);
      marketSnapshotsByTicker.set(normalizedTicker, request);
      return request;
    },
    getPriceHistory(ticker: string, days: 30 | 90 | 365) {
      const normalizedTicker = ticker.toUpperCase();
      const cacheKey = `${normalizedTicker}:${days}`;
      const existingRequest = priceHistoryByTickerAndRange.get(cacheKey);
      if (existingRequest) return existingRequest;

      const request = options.marketClient.getPriceHistory(normalizedTicker, days);
      priceHistoryByTickerAndRange.set(cacheKey, request);
      return request;
    },
    getInsiderTransactions(query: Parameters<OwnershipToolClient['getTransactions']>[0]) {
      const cacheKey = JSON.stringify(query);
      const existingRequest = insiderTransactionsByQuery.get(cacheKey);
      if (existingRequest) return existingRequest;

      const request = options.ownershipClient.getTransactions(query);
      insiderTransactionsByQuery.set(cacheKey, request);
      return request;
    },
    getSources() {
      return [...sources.values()];
    },
  };
}

export type ResearchToolContext = ReturnType<typeof createResearchToolContext>;
