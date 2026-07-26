import { randomUUID } from 'node:crypto';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import {
  createResumeCommand,
  HumanReviewDecisionSchema,
  ResearchRequestSchema,
  type HumanReviewDecision,
} from '@investment-research/research';

import type { ResearchGraphCatalog } from './graphs.js';
import { responseForResult } from './response.js';
import type { PausedResearchRunStore } from './run-store.js';
import { streamGraphRun } from './stream.js';

type ResearchRoutesOptions = {
  graphs: ResearchGraphCatalog;
  runStore: PausedResearchRunStore;
  isProduction: boolean;
};

function fixtureModeIsUnavailable(secDataMode: 'live' | 'fixture', isProduction: boolean) {
  return secDataMode === 'fixture' && isProduction;
}

function streamFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Research stream failed.';
}

export function createResearchRoutes(options: ResearchRoutesOptions) {
  const routes = new Hono();

  routes.post('/research', zValidator('json', ResearchRequestSchema), async (context) => {
    const input = context.req.valid('json');
    if (fixtureModeIsUnavailable(input.secDataMode, options.isProduction)) {
      return context.json({ message: 'SEC fixtures are available only in development.' }, 400);
    }

    const result = await options.graphs.forRequest(input.secDataMode).invoke(input);
    return context.json(responseForResult(result, input.secDataMode));
  });

  routes.post('/research/stream', zValidator('json', ResearchRequestSchema), async (context) => {
    const input = context.req.valid('json');
    if (fixtureModeIsUnavailable(input.secDataMode, options.isProduction)) {
      return context.json({ message: 'SEC fixtures are available only in development.' }, 400);
    }

    const graph = options.graphs.forRequest(input.secDataMode, true);
    const runId = randomUUID();

    return streamSSE(context, async (stream) => {
      await stream.writeSSE({
        event: 'run.started',
        data: JSON.stringify({ runId, ticker: input.ticker, secDataMode: input.secDataMode }),
      });

      try {
        await streamGraphRun({
          stream,
          graph,
          graphInput: input,
          runId,
          secDataMode: input.secDataMode,
          runStore: options.runStore,
        });
      } catch (error) {
        options.runStore.delete(runId);
        await stream.writeSSE({
          event: 'run.failed',
          data: JSON.stringify({ message: streamFailureMessage(error) }),
        });
      }
    });
  });

  routes.post(
    '/research/:runId/resume/stream',
    zValidator('json', HumanReviewDecisionSchema),
    async (context) => {
      const runId = context.req.param('runId');
      const run = options.runStore.get(runId);
      if (!run) return context.json({ message: 'Paused research run was not found.' }, 404);

      const decision: HumanReviewDecision = context.req.valid('json');
      const graph = options.graphs.forRequest(run.secDataMode, true);

      return streamSSE(context, async (stream) => {
        await stream.writeSSE({
          event: 'run.resumed',
          data: JSON.stringify({ runId, decision: decision.decision }),
        });

        try {
          await streamGraphRun({
            stream,
            graph,
            graphInput: createResumeCommand(decision),
            runId,
            secDataMode: run.secDataMode,
            runStore: options.runStore,
          });
        } catch (error) {
          options.runStore.delete(runId);
          await stream.writeSSE({
            event: 'run.failed',
            data: JSON.stringify({ message: streamFailureMessage(error) }),
          });
        }
      });
    },
  );

  return routes;
}
