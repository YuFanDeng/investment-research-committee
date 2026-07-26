import type { ChallengeReport, ResearchMemo } from './schemas.js';
import type { ResearchStateValue } from './state.js';

export function buildDeterministicMemo(state: ResearchStateValue): ResearchMemo {
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

export function buildDeterministicChallenge(state: ResearchStateValue): ChallengeReport {
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
