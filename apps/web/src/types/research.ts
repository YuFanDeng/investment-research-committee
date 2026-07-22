export type ResearchStatus = 'pending' | 'researching' | 'complete' | 'failed';

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

export type ResearchMemo = {
  companySnapshot: string;
  financialHighlights: string[];
  whatStandsOut: string[];
  risksAndLimitations: string[];
  sourceIdsUsed: string[];
  disclaimer: string;
};

export type ResearchResponse = {
  ticker: string;
  companyName?: string;
  status: ResearchStatus;
  fundamentals?: Fundamentals;
  memo?: ResearchMemo;
  sources: Source[];
  errors: string[];
};

export type ResearchPhaseId = 'validate' | 'evidence' | 'memo' | 'verify';
