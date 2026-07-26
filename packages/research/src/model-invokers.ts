import { AnalystReportSchema, ChallengeReportSchema, ResearchMemoSchema } from './schemas.js';
import { createResearchModel, getModelSettings } from './model.js';
import type { CommitteeMessage } from './prompts/committee.js';

export type ModelEnvironment = Record<string, string | undefined>;

export type ModelInvoker = (
  messages: CommitteeMessage[],
  environment: ModelEnvironment,
) => Promise<unknown>;

export async function invokeOllamaAnalyst(
  messages: CommitteeMessage[],
  environment: ModelEnvironment,
) {
  return createResearchModel(getModelSettings(environment))
    .withStructuredOutput(AnalystReportSchema)
    .invoke(messages);
}

export async function invokeOllamaChair(
  messages: CommitteeMessage[],
  environment: ModelEnvironment,
) {
  return createResearchModel(getModelSettings(environment))
    .withStructuredOutput(ResearchMemoSchema)
    .invoke(messages);
}

export async function invokeOllamaChallenge(
  messages: CommitteeMessage[],
  environment: ModelEnvironment,
) {
  return createResearchModel(getModelSettings(environment))
    .withStructuredOutput(ChallengeReportSchema)
    .invoke(messages);
}
