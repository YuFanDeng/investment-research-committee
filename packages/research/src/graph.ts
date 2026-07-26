import {
  Command,
  END,
  MemorySaver,
  START,
  StateGraph,
  type BaseCheckpointSaver,
} from '@langchain/langgraph';

import {
  invokeOllamaAnalyst,
  invokeOllamaChair,
  invokeOllamaChallenge,
  type ModelEnvironment,
  type ModelInvoker,
} from './model-invokers.js';
import {
  runAnalyst,
  runSkepticChallenge,
  writeChairDraft,
  writeFinalChairMemo,
} from './nodes/committee.js';
import { createEvidenceNodes, validateTicker } from './nodes/evidence.js';
import { createHumanApprovalNode, routeAfterHumanReview } from './nodes/human-review.js';
import type { HumanReviewDecision, ResearchRequest } from './schemas.js';
import { ResearchState, type ResearchStateUpdate } from './state.js';
import type { MassiveClient } from './tools/massive.js';
import type { SecEdgarClient } from './tools/sec-edgar.js';

export type ResearchGraphOptions = {
  secContactEmail: string;
  modelEnvironment: ModelEnvironment;
  secClient?: Pick<SecEdgarClient, 'getFundamentals'>;
  marketDataClient?: Pick<MassiveClient, 'getMarketSnapshot'>;
  invokeAnalystModel?: ModelInvoker;
  invokeChallengeModel?: ModelInvoker;
  invokeDraftMemoModel?: ModelInvoker;
  invokeMemoModel?: ModelInvoker;
  requireHumanApproval?: boolean;
  checkpointer?: BaseCheckpointSaver;
};

type ResearchNode =
  | '__start__'
  | 'validateTicker'
  | 'fetchSecFundamentals'
  | 'fetchMarketData'
  | 'fundamentalsAnalyst'
  | 'businessQualityAnalyst'
  | 'valuationAnalyst'
  | 'committeeDraft'
  | 'skepticChallenge'
  | 'humanApproval'
  | 'committeeChair';

export function createResearchCheckpointer() {
  return new MemorySaver();
}

export function createResumeCommand(decision: HumanReviewDecision) {
  return new Command<HumanReviewDecision, ResearchStateUpdate, ResearchNode>({
    resume: decision,
  });
}

export function createResearchGraph(options: ResearchGraphOptions) {
  const evidenceNodes = createEvidenceNodes(options);
  const requestHumanApproval = createHumanApprovalNode(Boolean(options.requireHumanApproval));
  const invokeAnalyst = options.invokeAnalystModel ?? invokeOllamaAnalyst;
  const invokeChallenge = options.invokeChallengeModel ?? invokeOllamaChallenge;
  const invokeDraftMemo = options.invokeDraftMemoModel ?? invokeOllamaChair;
  const invokeFinalMemo = options.invokeMemoModel ?? invokeOllamaChair;

  return new StateGraph(ResearchState)
    .addNode('validateTicker', validateTicker)
    .addNode('fetchSecFundamentals', evidenceNodes.fetchSecFundamentals)
    .addNode('fetchMarketData', evidenceNodes.fetchMarketData)
    .addNode('fundamentalsAnalyst', (state) =>
      runAnalyst(state, 'fundamentals', options.modelEnvironment, invokeAnalyst),
    )
    .addNode('businessQualityAnalyst', (state) =>
      runAnalyst(state, 'business_quality', options.modelEnvironment, invokeAnalyst),
    )
    .addNode('valuationAnalyst', (state) =>
      runAnalyst(state, 'valuation', options.modelEnvironment, invokeAnalyst),
    )
    .addNode('committeeDraft', (state) =>
      writeChairDraft(state, options.modelEnvironment, invokeDraftMemo),
    )
    .addNode('skepticChallenge', (state) =>
      runSkepticChallenge(state, options.modelEnvironment, invokeChallenge),
    )
    .addNode('humanApproval', requestHumanApproval)
    .addNode('committeeChair', (state) =>
      writeFinalChairMemo(state, options.modelEnvironment, invokeFinalMemo),
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
    .addEdge('skepticChallenge', 'humanApproval')
    .addConditionalEdges('humanApproval', routeAfterHumanReview, {
      continue: 'committeeChair',
      reject: END,
    })
    .addEdge('committeeChair', END)
    .compile(options.checkpointer ? { checkpointer: options.checkpointer } : undefined);
}

export type ResearchGraph = ReturnType<typeof createResearchGraph>;
export type ResearchGraphInput = ResearchRequest;
export type ResearchGraphResult = Awaited<ReturnType<ResearchGraph['invoke']>>;
