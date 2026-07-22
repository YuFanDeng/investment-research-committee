import { ChatOllama } from '@langchain/ollama';
import { z } from 'zod';

const ModelSettingsSchema = z.object({
  provider: z.literal('ollama'),
  baseUrl: z.string().url(),
  model: z.string().min(1),
});

export type ModelSettings = z.infer<typeof ModelSettingsSchema>;

/**
 * Reads model configuration explicitly so the graph does not depend directly
 * on process.env. That keeps the research package easy to test and reuse.
 */
export function getModelSettings(environment: Record<string, string | undefined>): ModelSettings {
  const provider = environment.MODEL_PROVIDER?.toLowerCase() ?? 'ollama';

  if (provider !== 'ollama') {
    throw new Error(
      `Unsupported model provider: ${provider}. The local setup currently supports Ollama.`,
    );
  }

  return ModelSettingsSchema.parse({
    provider,
    baseUrl: environment.OLLAMA_BASE_URL ?? 'http://localhost:11434',
    model: environment.OLLAMA_MODEL,
  });
}

/**
 * Creates the LangChain chat model without coupling graph nodes to a provider.
 * Structured output will be attached by the memo-writing node in step 3.
 */
export function createResearchModel(settings: ModelSettings) {
  return new ChatOllama({
    baseUrl: settings.baseUrl,
    model: settings.model,
    temperature: 0,
    maxRetries: 2,
  });
}
