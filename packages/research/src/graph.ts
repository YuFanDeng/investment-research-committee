import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

import {
  type Fundamentals,
  type ResearchMemo,
  type ResearchRequest,
  type Source,
} from './schemas.js';
import { SecEdgarClient, SecEdgarError } from './tools/sec-edgar.js';

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

async function writeMockMemo(state: typeof ResearchState.State) {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    return { status: 'failed' as const, errors: ['No fundamentals were available.'] };
  }

  return {
    status: 'complete' as const,
    memo: {
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
        'Financial concepts can be reported differently across issuers; review the linked filing data before drawing conclusions.',
      ],
      sourceIdsUsed: state.sources.map((source) => source.id),
      disclaimer: 'For educational research only. This is not investment advice.',
    },
  };
}

export function createResearchGraph(options: { secContactEmail: string }) {
  const secEdgar = new SecEdgarClient(options.secContactEmail);

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
    .addNode('writeMockMemo', writeMockMemo)
    .addEdge(START, 'validateTicker')
    .addEdge('validateTicker', 'fetchSecFundamentals')
    .addEdge('fetchSecFundamentals', 'writeMockMemo')
    .addEdge('writeMockMemo', END)
    .compile();
}

export type ResearchGraphInput = ResearchRequest;
