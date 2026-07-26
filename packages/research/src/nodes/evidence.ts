import type { ModelEnvironment } from '../model-invokers.js';
import type { ResearchStateValue } from '../state.js';
import { MassiveClient, MassiveError } from '../tools/massive.js';
import { SecEdgarClient, SecEdgarError } from '../tools/sec-edgar.js';

type SecClient = Pick<SecEdgarClient, 'getFundamentals'>;
type MarketDataClient = Pick<MassiveClient, 'getMarketSnapshot'>;

export function validateTicker(state: ResearchStateValue) {
  return { ticker: state.ticker, status: 'researching' as const };
}

export function createEvidenceNodes(options: {
  secContactEmail: string;
  modelEnvironment: ModelEnvironment;
  secClient?: SecClient;
  marketDataClient?: MarketDataClient;
}) {
  const secEdgar = options.secClient ?? new SecEdgarClient(options.secContactEmail);

  async function fetchSecFundamentals(state: ResearchStateValue) {
    try {
      const result = await secEdgar.getFundamentals(state.ticker);
      return {
        companyName: result.companyName,
        fundamentals: result.fundamentals,
        sources: [result.source],
      };
    } catch (error) {
      const message =
        error instanceof SecEdgarError ? error.message : 'SEC EDGAR research failed unexpectedly.';
      return { status: 'failed' as const, errors: [message] };
    }
  }

  async function fetchMarketData(state: ResearchStateValue) {
    try {
      const massive =
        options.marketDataClient ??
        new MassiveClient({ apiKey: options.modelEnvironment.MASSIVE_API_KEY });
      const result = await massive.getMarketSnapshot(state.ticker);
      return { marketSnapshot: result.snapshot, sources: [result.source] };
    } catch (error) {
      const message =
        error instanceof MassiveError ? error.message : 'Massive market data failed unexpectedly.';
      return { errors: [message] };
    }
  }

  return { fetchMarketData, fetchSecFundamentals };
}
