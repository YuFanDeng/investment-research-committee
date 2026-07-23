import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import {
  ResearchMemoSchema,
  AnalystReportSchema,
  ChallengeReportSchema,
  type AnalystReport,
  type AnalystRole,
  type ChallengeReport,
  type Fundamentals,
  type MarketSnapshot,
  type ResearchMemo,
  type ResearchRequest,
  type Source,
} from './schemas.js';
import { createResearchModel, getModelSettings } from './model.js';
import {
  buildAnalystMessages,
  buildChairMessages,
  buildFinalChairMessages,
  buildFallbackAnalystReport,
  buildSkepticMessages,
  type CommitteeMessage,
} from './prompts/committee.js';
import { SecEdgarClient, SecEdgarError, type SecFundamentals } from './tools/sec-edgar.js';
import { MassiveClient, MassiveError } from './tools/massive.js';

const ResearchState = Annotation.Root({
  ticker: Annotation<string>,
  companyName: Annotation<string | undefined>,
  status: Annotation<'pending' | 'researching' | 'complete' | 'failed'>,
  fundamentals: Annotation<Fundamentals | undefined>,
  marketSnapshot: Annotation<MarketSnapshot | undefined>,
  memo: Annotation<ResearchMemo | undefined>,
  draftMemo: Annotation<ResearchMemo | undefined>,
  challengeReport: Annotation<ChallengeReport | undefined>,
  analystReports: Annotation<AnalystReport[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  sources: Annotation<Source[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
  errors: Annotation<string[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),
});

async function validateTicker(state: typeof ResearchState.State) {
  return { ticker: state.ticker, status: 'researching' as const };
}

type ModelEnvironment = Record<string, string | undefined>;

export function buildDeterministicMemo(state: typeof ResearchState.State): ResearchMemo {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    throw new Error('Cannot build a memo without fundamentals.');
  }

  return {
    companySnapshot: `${state.companyName ?? state.ticker} (${state.ticker}) reported the following SEC EDGAR annual fundamentals for fiscal year ${fundamentals.fiscalYear}.`,
    financialHighlights: [
      `FY${fundamentals.fiscalYear} revenue: $${(fundamentals.revenueUsd / 1_000_000_000).toFixed(1)}B.`,
      `FY${fundamentals.fiscalYear} net income: $${(fundamentals.netIncomeUsd / 1_000_000_000).toFixed(1)}B.`,
      `FY${fundamentals.fiscalYear} operating cash flow: $${(fundamentals.operatingCashFlowUsd / 1_000_000_000).toFixed(1)}B.`,
    ],
    whatStandsOut: [
      'These figures are normalized from SEC EDGAR Company Facts and are ready for deeper analysis.',
    ],
    risksAndLimitations: [
      'The local language model was unavailable, so this memo contains deterministic facts only.',
      'Financial concepts can be reported differently across issuers; review the linked filing data before drawing conclusions.',
    ],
    sourceIdsUsed: state.sources.map((source) => source.id),
    disclaimer: 'For educational research only. This is not investment advice.',
  };
}

type ModelInvoker = (
  messages: CommitteeMessage[],
  environment: ModelEnvironment,
) => Promise<unknown>;

async function invokeOllamaModel(messages: CommitteeMessage[], modelEnvironment: ModelEnvironment) {
  const model = createResearchModel(getModelSettings(modelEnvironment)).withStructuredOutput(
    AnalystReportSchema,
  );
  return model.invoke(messages);
}

async function invokeOllamaChair(messages: CommitteeMessage[], modelEnvironment: ModelEnvironment) {
  const model = createResearchModel(getModelSettings(modelEnvironment)).withStructuredOutput(
    ResearchMemoSchema,
  );
  return model.invoke(messages);
}

async function invokeOllamaChallenge(
  messages: CommitteeMessage[],
  modelEnvironment: ModelEnvironment,
) {
  const model = createResearchModel(getModelSettings(modelEnvironment)).withStructuredOutput(
    ChallengeReportSchema,
  );
  return model.invoke(messages);
}

async function runAnalyst(
  state: typeof ResearchState.State,
  role: AnalystRole,
  modelEnvironment: ModelEnvironment,
  invokeAnalystModel: ModelInvoker,
) {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    return { status: 'failed' as const, errors: ['No fundamentals were available.'] };
  }

  const evidence = {
    ticker: state.ticker,
    companyName: state.companyName,
    fundamentals,
    marketSnapshot: state.marketSnapshot,
    sources: state.sources,
  };

  try {
    const report = await invokeAnalystModel(buildAnalystMessages(role, evidence), modelEnvironment);
    return { analystReports: [AnalystReportSchema.parse(report)] };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';
    return {
      analystReports: [buildFallbackAnalystReport(role, evidence)],
      errors: [`${role} analyst fallback used: ${reason}`],
    };
  }
}

async function writeChairDraft(
  state: typeof ResearchState.State,
  modelEnvironment: ModelEnvironment,
  invokeChairModel: ModelInvoker,
) {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    return { status: 'failed' as const, errors: ['No fundamentals were available.'] };
  }

  try {
    const memo = await invokeChairModel(
      buildChairMessages({
        ticker: state.ticker,
        companyName: state.companyName,
        fundamentals,
        marketSnapshot: state.marketSnapshot,
        sources: state.sources,
        analystReports: state.analystReports,
      }),
      modelEnvironment,
    );

    return { draftMemo: ResearchMemoSchema.parse(memo) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';

    return {
      draftMemo: buildDeterministicMemo(state),
      errors: [
        `Committee chair draft was unavailable; returned deterministic SEC facts instead. ${reason}`,
      ],
    };
  }
}

function buildDeterministicChallenge(state: typeof ResearchState.State): ChallengeReport {
  return {
    thesisWeaknesses: ['The draft is based on a limited evidence set.'],
    unsupportedClaims: [],
    missingEvidence: [
      'Review the underlying filing and market-data sources before relying on the memo.',
    ],
    keyRisks: ['The available data may not represent the company’s latest operating conditions.'],
    requiredRevisions: ['Keep the educational disclaimer and make uncertainty visible.'],
    confidence: 0.8,
    sourceIdsUsed: state.sources.map((source) => source.id),
  };
}

async function runSkepticChallenge(
  state: typeof ResearchState.State,
  modelEnvironment: ModelEnvironment,
  invokeChallengeModel: ModelInvoker,
) {
  if (!state.draftMemo || !state.fundamentals) {
    return {
      status: 'failed' as const,
      errors: ['No chair draft was available for skeptic review.'],
    };
  }

  try {
    const challenge = await invokeChallengeModel(
      buildSkepticMessages({
        ticker: state.ticker,
        companyName: state.companyName,
        fundamentals: state.fundamentals,
        marketSnapshot: state.marketSnapshot,
        sources: state.sources,
        analystReports: state.analystReports,
        draftMemo: state.draftMemo,
      }),
      modelEnvironment,
    );
    return { challengeReport: ChallengeReportSchema.parse(challenge) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';
    return {
      challengeReport: buildDeterministicChallenge(state),
      errors: [`Skeptic challenge fallback used: ${reason}`],
    };
  }
}

async function writeFinalChairMemo(
  state: typeof ResearchState.State,
  modelEnvironment: ModelEnvironment,
  invokeChairModel: ModelInvoker,
) {
  if (!state.draftMemo || !state.challengeReport || !state.fundamentals) {
    return { status: 'failed' as const, errors: ['Committee review was incomplete.'] };
  }

  try {
    const memo = await invokeChairModel(
      buildFinalChairMessages({
        ticker: state.ticker,
        companyName: state.companyName,
        fundamentals: state.fundamentals,
        marketSnapshot: state.marketSnapshot,
        sources: state.sources,
        analystReports: state.analystReports,
        draftMemo: state.draftMemo,
        challengeReport: state.challengeReport,
      }),
      modelEnvironment,
    );
    return { status: 'complete' as const, memo: ResearchMemoSchema.parse(memo) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';
    return {
      status: 'complete' as const,
      memo: state.draftMemo,
      errors: [`Final chair synthesis was unavailable; returned the draft memo instead. ${reason}`],
    };
  }
}

export function createResearchGraph(options: {
  secContactEmail: string;
  modelEnvironment: ModelEnvironment;
  secClient?: Pick<SecEdgarClient, 'getFundamentals'>;
  marketDataClient?: Pick<MassiveClient, 'getMarketSnapshot'>;
  invokeAnalystModel?: ModelInvoker;
  invokeChallengeModel?: ModelInvoker;
  invokeDraftMemoModel?: ModelInvoker;
  invokeMemoModel?: ModelInvoker;
}) {
  const secEdgar = options.secClient ?? new SecEdgarClient(options.secContactEmail);
  const invokeAnalystModel = options.invokeAnalystModel ?? invokeOllamaModel;
  const invokeChallengeModel = options.invokeChallengeModel ?? invokeOllamaChallenge;
  const invokeDraftMemoModel = options.invokeDraftMemoModel ?? invokeOllamaChair;
  const invokeChairModel = options.invokeMemoModel ?? invokeOllamaChair;

  async function fetchSecFundamentals(state: typeof ResearchState.State) {
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

  async function fetchMarketData(state: typeof ResearchState.State) {
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

  return new StateGraph(ResearchState)
    .addNode('validateTicker', validateTicker)
    .addNode('fetchSecFundamentals', fetchSecFundamentals)
    .addNode('fetchMarketData', fetchMarketData)
    .addNode('fundamentalsAnalyst', (state) =>
      runAnalyst(state, 'fundamentals', options.modelEnvironment, invokeAnalystModel),
    )
    .addNode('businessQualityAnalyst', (state) =>
      runAnalyst(state, 'business_quality', options.modelEnvironment, invokeAnalystModel),
    )
    .addNode('valuationAnalyst', (state) =>
      runAnalyst(state, 'valuation', options.modelEnvironment, invokeAnalystModel),
    )
    .addNode('committeeDraft', (state) =>
      writeChairDraft(state, options.modelEnvironment, invokeDraftMemoModel),
    )
    .addNode('skepticChallenge', (state) =>
      runSkepticChallenge(state, options.modelEnvironment, invokeChallengeModel),
    )
    .addNode('committeeChair', (state) =>
      writeFinalChairMemo(state, options.modelEnvironment, invokeChairModel),
    )
    .addEdge(START, 'validateTicker')
    .addEdge('validateTicker', 'fetchSecFundamentals')
    .addEdge('validateTicker', 'fetchMarketData')
    .addEdge('fetchSecFundamentals', 'fundamentalsAnalyst')
    .addEdge('fetchMarketData', 'fundamentalsAnalyst')
    .addEdge('fetchSecFundamentals', 'businessQualityAnalyst')
    .addEdge('fetchMarketData', 'businessQualityAnalyst')
    .addEdge('fetchSecFundamentals', 'valuationAnalyst')
    .addEdge('fetchMarketData', 'valuationAnalyst')
    .addEdge('fundamentalsAnalyst', 'committeeDraft')
    .addEdge('businessQualityAnalyst', 'committeeDraft')
    .addEdge('valuationAnalyst', 'committeeDraft')
    .addEdge('committeeDraft', 'skepticChallenge')
    .addEdge('skepticChallenge', 'committeeChair')
    .addEdge('committeeChair', END)
    .compile();
}

export type ResearchGraphInput = ResearchRequest;
