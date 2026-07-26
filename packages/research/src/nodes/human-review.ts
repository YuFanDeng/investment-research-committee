import { interrupt } from '@langchain/langgraph';

import {
  HumanReviewDecisionSchema,
  type HumanReviewDecision,
  type HumanReviewRequest,
} from '../schemas.js';
import type { ResearchStateValue } from '../state.js';

function buildHumanReviewRequest(state: ResearchStateValue): HumanReviewRequest {
  if (!state.challengeReport) {
    throw new Error('A skeptic challenge is required before human review.');
  }

  return {
    type: 'committee_sign_off',
    ticker: state.ticker,
    companyName: state.companyName,
    challengeReport: state.challengeReport,
    warnings: state.errors,
    allowedDecisions: ['approve', 'revise', 'reject'],
  };
}

export function createHumanApprovalNode(requireHumanApproval: boolean) {
  return function requestHumanApproval(state: ResearchStateValue) {
    const decision = requireHumanApproval
      ? HumanReviewDecisionSchema.parse(interrupt(buildHumanReviewRequest(state)))
      : ({ decision: 'approve' } satisfies HumanReviewDecision);

    return {
      humanReview: decision,
      status: decision.decision === 'reject' ? ('rejected' as const) : ('researching' as const),
    };
  };
}

export function routeAfterHumanReview(state: ResearchStateValue) {
  return state.humanReview?.decision === 'reject' ? 'reject' : 'continue';
}
