import {
  createResearchAssistantRun,
  FixtureSecEdgarClient,
  MassiveClient,
  SecEdgarClient,
  type ResearchAssistantRequest,
} from '@investment-research/research';

type CreateAssistantFactoryOptions = {
  secContactEmail: string;
  modelEnvironment: Record<string, string | undefined>;
};

export function createAssistantFactory(options: CreateAssistantFactoryOptions) {
  const liveSecClient = new SecEdgarClient(options.secContactEmail);
  const fixtureSecClient = new FixtureSecEdgarClient();
  const marketClient = {
    getMarketSnapshot(ticker: string) {
      return new MassiveClient({
        apiKey: options.modelEnvironment.MASSIVE_API_KEY,
      }).getMarketSnapshot(ticker);
    },
    getPriceHistory(ticker: string, days: 30 | 90 | 365) {
      return new MassiveClient({
        apiKey: options.modelEnvironment.MASSIVE_API_KEY,
      }).getPriceHistory(ticker, days);
    },
  };

  return {
    createRun(request: ResearchAssistantRequest) {
      return createResearchAssistantRun({
        request,
        modelEnvironment: options.modelEnvironment,
        secClient: request.secDataMode === 'fixture' ? fixtureSecClient : liveSecClient,
        marketClient,
      });
    },
  };
}

export type AssistantFactory = ReturnType<typeof createAssistantFactory>;
