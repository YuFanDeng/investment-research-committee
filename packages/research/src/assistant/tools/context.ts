import type { Source } from '../../schemas.js';
import type { MassiveClient } from '../../tools/massive.js';
import type { SecEdgarClient } from '../../tools/sec-edgar.js';

export type SecToolClient = Pick<SecEdgarClient, 'getFundamentals' | 'getRecentFilings'>;
export type MarketToolClient = Pick<MassiveClient, 'getMarketSnapshot' | 'getPriceHistory'>;

export type CreateResearchToolContextOptions = {
  secClient: SecToolClient;
  marketClient: MarketToolClient;
};

export function createResearchToolContext(options: CreateResearchToolContextOptions) {
  const sources = new Map<string, Source>();
  const fundamentalsByTicker = new Map<string, ReturnType<SecToolClient['getFundamentals']>>();
  const marketSnapshotsByTicker = new Map<
    string,
    ReturnType<MarketToolClient['getMarketSnapshot']>
  >();

  return {
    secClient: options.secClient,
    marketClient: options.marketClient,
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
    getMarketSnapshot(ticker: string) {
      const normalizedTicker = ticker.toUpperCase();
      const existingRequest = marketSnapshotsByTicker.get(normalizedTicker);
      if (existingRequest) return existingRequest;

      const request = options.marketClient.getMarketSnapshot(normalizedTicker);
      marketSnapshotsByTicker.set(normalizedTicker, request);
      return request;
    },
    getSources() {
      return [...sources.values()];
    },
  };
}

export type ResearchToolContext = ReturnType<typeof createResearchToolContext>;
