import { describe, expect, it } from 'vitest';

import { createResearchModel, getModelSettings } from './model.js';

describe('Ollama model settings', () => {
  it('defaults the context window to 4096 tokens', () => {
    expect(
      getModelSettings({
        OLLAMA_MODEL: 'test-model',
      }),
    ).toEqual({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'test-model',
      numCtx: 4096,
    });
  });

  it('accepts a configured context window', () => {
    expect(
      getModelSettings({
        OLLAMA_MODEL: 'test-model',
        OLLAMA_NUM_CTX: '8192',
      }).numCtx,
    ).toBe(8192);
  });

  it('passes the context window to ChatOllama', () => {
    const model = createResearchModel({
      provider: 'ollama',
      baseUrl: 'http://localhost:11434',
      model: 'test-model',
      numCtx: 4096,
    });

    expect(model).toMatchObject({ numCtx: 4096 });
  });
});
