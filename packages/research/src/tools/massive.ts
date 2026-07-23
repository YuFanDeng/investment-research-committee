import {
  MarketSnapshotSchema,
  type MarketSnapshot,
  type PeerComparison,
  type Source,
} from '../schemas.js';

const DEFAULT_BASE_URL = 'https://api.massive.com';

type MassiveClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

type MassivePreviousResponse = {
  results?: Array<{ c?: number }>;
};

type MassiveAggregatesResponse = {
  results?: Array<{ c?: number; t?: number }>;
};

type MassiveTickerResponse = {
  results?: { name?: string; market_cap?: number; currency_name?: string };
};

type MassiveRelatedResponse = {
  results?: Array<{ ticker?: string }>;
};

export type MarketDataResult = {
  snapshot: MarketSnapshot;
  source: Source;
};

export class MassiveError extends Error {}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return isoDate(date);
}

export class MassiveClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: MassiveClientOptions = {}) {
    if (!options.apiKey) throw new MassiveError('MASSIVE_API_KEY must be configured.');
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetcher = options.fetcher ?? fetch;
  }

  private async requestJson<T>(path: string): Promise<T> {
    const url = new URL(path, this.baseUrl);
    url.searchParams.set('apiKey', this.apiKey);

    let response: Response;
    try {
      response = await this.fetcher(url);
    } catch {
      throw new MassiveError('Massive could not be reached. Please try again shortly.');
    }

    if (!response.ok) {
      throw new MassiveError(`Massive returned ${response.status} while retrieving market data.`);
    }

    const payload: unknown = await response.json();
    if (!isObject(payload)) throw new MassiveError('Massive returned an invalid response.');
    return payload as T;
  }

  private async getPeerComparisons(ticker: string): Promise<PeerComparison[]> {
    const related = await this.requestJson<MassiveRelatedResponse>(
      `/v1/related-companies/${encodeURIComponent(ticker.toUpperCase())}`,
    );
    const peerTickers = (related.results ?? [])
      .map((peer) => peer.ticker?.toUpperCase())
      .filter((peer): peer is string => Boolean(peer) && peer !== ticker.toUpperCase())
      .slice(0, 3);

    const details = await Promise.all(
      peerTickers.map(async (peerTicker) => {
        const response = await this.requestJson<MassiveTickerResponse>(
          `/v3/reference/tickers/${encodeURIComponent(peerTicker)}`,
        );
        return {
          ticker: peerTicker,
          name: response.results?.name,
          marketCap: response.results?.market_cap,
          currency: response.results?.currency_name,
        } satisfies PeerComparison;
      }),
    );

    return details;
  }

  async getMarketSnapshot(ticker: string): Promise<MarketDataResult> {
    const encodedTicker = encodeURIComponent(ticker.toUpperCase());
    const [previous, aggregates, tickerDetails, peers] = await Promise.all([
      this.requestJson<MassivePreviousResponse>(`/v2/aggs/ticker/${encodedTicker}/prev`),
      this.requestJson<MassiveAggregatesResponse>(
        `/v2/aggs/ticker/${encodedTicker}/range/1/day/${dateDaysAgo(365)}/${isoDate(new Date())}`,
      ),
      this.requestJson<MassiveTickerResponse>(`/v3/reference/tickers/${encodedTicker}`),
      this.getPeerComparisons(ticker),
    ]);

    const previousClose = previous.results?.[0]?.c;
    const historicalCloses = (aggregates.results ?? [])
      .filter(
        (bar): bar is { c: number; t: number } =>
          typeof bar.c === 'number' && typeof bar.t === 'number',
      )
      .map((bar) => ({ date: new Date(bar.t).toISOString().slice(0, 10), close: bar.c }));

    if (typeof previousClose !== 'number' || historicalCloses.length === 0) {
      throw new MassiveError(
        `Massive returned no usable price history for ${ticker.toUpperCase()}.`,
      );
    }

    const retrievedAt = new Date().toISOString();
    const sourceId = `massive-market-${ticker.toUpperCase()}`;
    const source: Source = {
      id: sourceId,
      title: `${ticker.toUpperCase()} — Massive market data`,
      url: `https://massive.com/stocks/${ticker.toUpperCase()}`,
      sourceType: 'market_data',
      retrievedAt,
    };

    const snapshot = MarketSnapshotSchema.parse({
      currentPrice: previousClose,
      previousClose,
      historicalCloses,
      marketCap: tickerDetails.results?.market_cap,
      currency: tickerDetails.results?.currency_name ?? 'USD',
      adjusted: true,
      retrievedAt,
      sourceId,
      peers,
    });

    return { snapshot, source };
  }
}
