import { buildDeterministicChallenge, buildDeterministicMemo } from '../fallbacks.js';
import type { ModelEnvironment, ModelInvoker } from '../model-invokers.js';
import {
  buildAnalystMessages,
  buildChairMessages,
  buildFallbackAnalystReport,
  buildFinalChairMessages,
  buildSkepticMessages,
} from '../prompts/committee.js';
import {
  AnalystReportSchema,
  ChallengeReportSchema,
  ResearchMemoSchema,
  type AnalystRole,
} from '../schemas.js';
import type { ResearchStateValue } from '../state.js';

export async function runAnalyst(
  state: ResearchStateValue,
  role: AnalystRole,
  modelEnvironment: ModelEnvironment,
  invokeModel: ModelInvoker,
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
    const report = await invokeModel(buildAnalystMessages(role, evidence), modelEnvironment);
    return { analystReports: [AnalystReportSchema.parse(report)] };
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unknown Ollama error.';
    return {
      analystReports: [buildFallbackAnalystReport(role, evidence)],
      errors: [`${role} analyst fallback used: ${reason}`],
    };
  }
}

export async function writeChairDraft(
  state: ResearchStateValue,
  modelEnvironment: ModelEnvironment,
  invokeModel: ModelInvoker,
) {
  const fundamentals = state.fundamentals;

  if (!fundamentals) {
    return { status: 'failed' as const, errors: ['No fundamentals were available.'] };
  }

  try {
    const memo = await invokeModel(
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

export async function runSkepticChallenge(
  state: ResearchStateValue,
  modelEnvironment: ModelEnvironment,
  invokeModel: ModelInvoker,
) {
  if (!state.draftMemo || !state.fundamentals) {
    return {
      status: 'failed' as const,
      errors: ['No chair draft was available for skeptic review.'],
    };
  }

  try {
    const challenge = await invokeModel(
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

export async function writeFinalChairMemo(
  state: ResearchStateValue,
  modelEnvironment: ModelEnvironment,
  invokeModel: ModelInvoker,
) {
  if (!state.draftMemo || !state.challengeReport || !state.fundamentals) {
    return { status: 'failed' as const, errors: ['Committee review was incomplete.'] };
  }

  try {
    const memo = await invokeModel(
      buildFinalChairMessages({
        ticker: state.ticker,
        companyName: state.companyName,
        analystReports: state.analystReports,
        draftMemo: state.draftMemo,
        challengeReport: state.challengeReport,
        humanReview: state.humanReview,
        sourceIds: state.sources.map((source) => source.id),
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
