import { Annotation } from '@langchain/langgraph';

import type {
  AnalystReport,
  ChallengeReport,
  Fundamentals,
  HumanReviewDecision,
  MarketSnapshot,
  ResearchMemo,
  Source,
} from './schemas.js';

export const ResearchState = Annotation.Root({
  ticker: Annotation<string>,
  companyName: Annotation<string | undefined>,
  status: Annotation<'pending' | 'researching' | 'complete' | 'failed' | 'rejected'>,
  fundamentals: Annotation<Fundamentals | undefined>,
  marketSnapshot: Annotation<MarketSnapshot | undefined>,
  memo: Annotation<ResearchMemo | undefined>,
  draftMemo: Annotation<ResearchMemo | undefined>,
  challengeReport: Annotation<ChallengeReport | undefined>,
  humanReview: Annotation<HumanReviewDecision | undefined>,
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

export type ResearchStateValue = typeof ResearchState.State;
export type ResearchStateUpdate = typeof ResearchState.Update;
