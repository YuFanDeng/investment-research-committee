export type ResearchStatus = 'pending' | 'researching' | 'complete' | 'failed' | 'rejected';
export type SecDataMode = 'live' | 'fixture';

export type Source = {
  id: string;
  title: string;
  url: string;
  sourceType: 'sec_filing' | 'market_data';
  retrievedAt: string;
};

export type Fundamentals = {
  fiscalYear: number;
  revenueUsd: number;
  netIncomeUsd: number;
  operatingCashFlowUsd: number;
};

export type MarketSnapshot = {
  currentPrice: number;
  previousClose?: number;
  historicalCloses: Array<{ date: string; close: number }>;
  marketCap?: number;
  currency: string;
  adjusted: boolean;
  retrievedAt: string;
  sourceId: string;
  peers: PeerComparison[];
};

export type PeerComparison = {
  ticker: string;
  name?: string;
  marketCap?: number;
  currency?: string;
};

export type ResearchMemo = {
  companySnapshot: string;
  financialHighlights: string[];
  whatStandsOut: string[];
  risksAndLimitations: string[];
  sourceIdsUsed: string[];
  disclaimer: string;
};

export type AnalystRole = 'fundamentals' | 'business_quality' | 'valuation';

export type AnalystReport = {
  role: AnalystRole;
  thesis: string;
  supportingEvidence: string[];
  concerns: string[];
  confidence: number;
  sourceIdsUsed: string[];
};

export type ChallengeReport = {
  thesisWeaknesses: string[];
  unsupportedClaims: string[];
  missingEvidence: string[];
  keyRisks: string[];
  requiredRevisions: string[];
  confidence: number;
  sourceIdsUsed: string[];
};

export type HumanReviewDecision = {
  decision: 'approve' | 'revise' | 'reject';
  feedback?: string;
};

export type HumanReviewRequest = {
  type: 'committee_sign_off';
  ticker: string;
  companyName?: string;
  challengeReport: ChallengeReport;
  warnings: string[];
  allowedDecisions: HumanReviewDecision['decision'][];
};

export type ResearchResponse = {
  ticker: string;
  companyName?: string;
  secDataMode: SecDataMode;
  status: ResearchStatus;
  fundamentals?: Fundamentals;
  marketSnapshot?: MarketSnapshot;
  analystReports: AnalystReport[];
  challengeReport?: ChallengeReport;
  memo?: ResearchMemo;
  sources: Source[];
  errors: string[];
};

export type ResearchEvent =
  | { type: 'run.started'; runId: string; ticker: string; secDataMode: SecDataMode }
  | { type: 'run.resumed'; runId: string; decision: HumanReviewDecision['decision'] }
  | { type: 'run.interrupted'; runId: string; request: HumanReviewRequest }
  | { type: 'stage.started'; stage: string }
  | { type: 'stage.completed'; stage: string }
  | {
      type: 'sec.completed';
      companyName?: string;
      fundamentals?: Fundamentals;
      sources: Source[];
      errors: string[];
    }
  | {
      type: 'market.completed';
      snapshot?: MarketSnapshot;
      sources: Source[];
      errors: string[];
    }
  | {
      type: 'analyst.completed';
      report?: AnalystReport;
      errors: string[];
    }
  | { type: 'draft.completed'; errors: string[] }
  | {
      type: 'challenge.completed';
      report?: ChallengeReport;
      errors: string[];
    }
  | { type: 'run.completed'; result: ResearchResponse }
  | { type: 'run.failed'; message: string };
