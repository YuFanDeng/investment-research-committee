import { randomUUID } from 'node:crypto';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { ResearchAssistantRequestSchema } from '@investment-research/research';

import type { AssistantFactory } from './factory.js';
import { streamAssistantRun } from './stream.js';

type AssistantRoutesOptions = {
  factory: AssistantFactory;
  isProduction: boolean;
};

export function createAssistantRoutes(options: AssistantRoutesOptions) {
  const routes = new Hono();

  routes.post(
    '/assistant/stream',
    zValidator('json', ResearchAssistantRequestSchema),
    async (context) => {
      const request = context.req.valid('json');
      if (request.secDataMode === 'fixture' && options.isProduction) {
        return context.json({ message: 'SEC fixtures are available only in development.' }, 400);
      }

      const runId = randomUUID();
      return streamSSE(context, async (stream) => {
        await stream.writeSSE({
          event: 'assistant.started',
          data: JSON.stringify({ runId, ticker: request.ticker }),
        });

        try {
          await streamAssistantRun({ stream, run: options.factory.createRun(request) });
        } catch (error) {
          await stream.writeSSE({
            event: 'assistant.failed',
            data: JSON.stringify({
              message: error instanceof Error ? error.message : 'Research assistant failed.',
            }),
          });
        }
      });
    },
  );

  return routes;
}
