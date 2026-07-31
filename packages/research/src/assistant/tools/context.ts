import type { Source } from '../../schemas.js';
import type { MassiveClient } from '../../tools/massive.js';
import type { SecEdgarClient } from '../../tools/sec-edgar.js';

export type SecToolClient = Pick<SecEdgarClient, 'getFundamentals' | 'getRecentFilings'>;
export type MarketToolClient = Pick<MassiveClient, 'getMarketSnapshot' | 'getPriceHistory'>;

export type CreateResearchToolContextOptions = {
  ticker: string;
  secClient: SecToolClient;
  marketClient: MarketToolClient;
};

export function createResearchToolContext(options: CreateResearchToolContextOptions) {
  const sources = new Map<string, Source>();
  let fundamentalsPromise: ReturnType<SecToolClient['getFundamentals']> | undefined;
  let marketSnapshotPromise: ReturnType<MarketToolClient['getMarketSnapshot']> | undefined;

  return {
    ticker: options.ticker,
    secClient: options.secClient,
    marketClient: options.marketClient,
    collectSource(source: Source) {
      sources.set(source.id, source);
    },
    getFundamentals() {
      fundamentalsPromise ??= options.secClient.getFundamentals(options.ticker);
      return fundamentalsPromise;
    },
    getMarketSnapshot() {
      marketSnapshotPromise ??= options.marketClient.getMarketSnapshot(options.ticker);
      return marketSnapshotPromise;
    },
    getSources() {
      return [...sources.values()];
    },
  };
}

export type ResearchToolContext = ReturnType<typeof createResearchToolContext>;
