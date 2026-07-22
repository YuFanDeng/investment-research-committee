import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import {
  ResearchMemoSchema,
  type Fundamentals,
  type ResearchMemo,
  type ResearchRequest,
  type Source,
} from './schemas.js';
import { createResearchModel, getModelSettings } from './model.js';
import { buildMemoWriterMessages, type MemoWriterMessage } from './prompts/memo-writer.js';
import { SecEdgarClient, SecEdgarError, type SecFundamentals } from './tools/sec-edgar.js';

const ResearchState = Annotation.Root({
  ticker: Annotation<string>,
  companyName: Annotation<string | undefined>,
  status: Annotation<'pending' | 'researching' | 'complete' | 'failed'>,
  fundamentals: Annotation<Fundamentals | undefined>,
  memo: Annotation<ResearchMemo | undefined>,
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

type MemoModelInvoker = (
  messages: MemoWriterMessage[],
  environment: ModelEnvironment,
) => Promise<unknown>;

async function invokeOllamaMemo(messages: MemoWriterMessage[], modelEnvironment: ModelEnvironment) {
  const model = createResearchModel(getModelSettings(modelEnvironment)).withStructuredOutput(
    ResearchMemoSchema,
  );
  return model.invoke(messages);
}

async function writeLlmMemo(
  state: typeof ResearchState.State,
  modelEnvironment: ModelEnvironment,
  invokeMemoModel: MemoModelInvoker,
) {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    return { status: 'failed' as const, errors: ['No fundamentals were available.'] };
  }

  try {
    const memo = await invokeMemoModel(
      buildMemoWriterMessages({
        ticker: state.ticker,
        companyName: state.companyName,
        fundamentals,
        sources: state.sources,
      }),
      modelEnvironment,
    );

    return { status: 'complete' as const, memo: ResearchMemoSchema.parse(memo) };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';

    return {
      status: 'complete' as const,
      memo: buildDeterministicMemo(state),
      errors: [
        `Ollama memo generation was unavailable; returned deterministic SEC facts instead. ${reason}`,
      ],
    };
  }
}

export function createResearchGraph(options: {
  secContactEmail: string;
  modelEnvironment: ModelEnvironment;
  secClient?: Pick<SecEdgarClient, 'getFundamentals'>;
  invokeMemoModel?: MemoModelInvoker;
}) {
  const secEdgar = options.secClient ?? new SecEdgarClient(options.secContactEmail);
  const invokeMemoModel = options.invokeMemoModel ?? invokeOllamaMemo;

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

  return new StateGraph(ResearchState)
    .addNode('validateTicker', validateTicker)
    .addNode('fetchSecFundamentals', fetchSecFundamentals)
    .addNode('writeLlmMemo', (state) =>
      writeLlmMemo(state, options.modelEnvironment, invokeMemoModel),
    )
    .addEdge(START, 'validateTicker')
    .addEdge('validateTicker', 'fetchSecFundamentals')
    .addEdge('fetchSecFundamentals', 'writeLlmMemo')
    .addEdge('writeLlmMemo', END)
    .compile();
}

export type ResearchGraphInput = ResearchRequest;
