import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import {
  createResearchGraph,
  FixtureSecEdgarClient,
  ResearchRequestSchema,
} from '@investment-research/research';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const contactEmail = process.env.SEC_CONTACT_EMAIL;
if (!contactEmail) throw new Error('SEC_CONTACT_EMAIL must be configured.');

const app = new Hono();
const liveResearchGraph = createResearchGraph({
  secContactEmail: contactEmail,
  modelEnvironment: { ...process.env },
});
const fixtureResearchGraph = createResearchGraph({
  secContactEmail: contactEmail,
  modelEnvironment: { ...process.env },
  secClient: new FixtureSecEdgarClient(),
});

function graphForRequest(secDataMode: 'live' | 'fixture') {
  return secDataMode === 'fixture' ? fixtureResearchGraph : liveResearchGraph;
}

function responseForResult(
  result: Awaited<ReturnType<typeof liveResearchGraph.invoke>>,
  secDataMode: 'live' | 'fixture',
) {
  return {
    ticker: result.ticker,
    secDataMode,
    companyName: result.companyName,
    status: result.status,
    fundamentals: result.fundamentals,
    marketSnapshot: result.marketSnapshot,
    analystReports: result.analystReports,
    challengeReport: result.challengeReport,
    memo: result.memo,
    sources: result.sources,
    errors: result.errors,
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

app.use(
  '/*',
  cors({
    origin: 'http://localhost:5173',
    allowMethods: ['POST', 'GET'],
  }),
);

app.get('/health', (context) => context.json({ status: 'ok' }));

app.post('/research', zValidator('json', ResearchRequestSchema), async (context) => {
  const input = context.req.valid('json');
  if (input.secDataMode === 'fixture' && process.env.NODE_ENV === 'production') {
    return context.json({ message: 'SEC fixtures are available only in development.' }, 400);
  }

  const graph = graphForRequest(input.secDataMode);
  const result = await graph.invoke(input);

  return context.json(responseForResult(result, input.secDataMode));
});

app.post('/research/stream', zValidator('json', ResearchRequestSchema), async (context) => {
  const input = context.req.valid('json');
  if (input.secDataMode === 'fixture' && process.env.NODE_ENV === 'production') {
    return context.json({ message: 'SEC fixtures are available only in development.' }, 400);
  }

  const graph = graphForRequest(input.secDataMode);

  return streamSSE(context, async (stream) => {
    await stream.writeSSE({
      event: 'run.started',
      data: JSON.stringify({ ticker: input.ticker, secDataMode: input.secDataMode }),
    });

    let finalState: Awaited<ReturnType<typeof liveResearchGraph.invoke>> | undefined;

    try {
      const graphStream = await graph.stream(input, {
        streamMode: ['values', 'updates', 'tasks'],
      } as never);

      for await (const rawChunk of graphStream as AsyncIterable<unknown>) {
        if (!Array.isArray(rawChunk) || rawChunk.length !== 2) continue;
        const [mode, payload] = rawChunk as [string, Record<string, unknown>];

        if (mode === 'values') {
          finalState = payload as typeof finalState;
          continue;
        }

        if (mode === 'updates') {
          for (const [stage, rawUpdate] of Object.entries(payload)) {
            const update = asRecord(rawUpdate);
            if (!update) continue;

            const shared = {
              errors: asArray(update.errors),
              sources: asArray(update.sources),
            };

            if (stage === 'fetchSecFundamentals') {
              await stream.writeSSE({
                event: 'sec.completed',
                data: JSON.stringify({
                  ...shared,
                  companyName: update.companyName,
                  fundamentals: update.fundamentals,
                }),
              });
            } else if (stage === 'fetchMarketData') {
              await stream.writeSSE({
                event: 'market.completed',
                data: JSON.stringify({
                  ...shared,
                  snapshot: update.marketSnapshot,
                }),
              });
            } else if (
              stage === 'fundamentalsAnalyst' ||
              stage === 'businessQualityAnalyst' ||
              stage === 'valuationAnalyst'
            ) {
              await stream.writeSSE({
                event: 'analyst.completed',
                data: JSON.stringify({
                  ...shared,
                  report: asArray(update.analystReports)[0],
                }),
              });
            } else if (stage === 'committeeDraft') {
              await stream.writeSSE({
                event: 'draft.completed',
                data: JSON.stringify({ errors: shared.errors }),
              });
            } else if (stage === 'skepticChallenge') {
              await stream.writeSSE({
                event: 'challenge.completed',
                data: JSON.stringify({
                  ...shared,
                  report: update.challengeReport,
                }),
              });
            }
          }
          continue;
        }

        if (mode !== 'tasks' || typeof payload.name !== 'string') continue;
        const eventType = 'result' in payload ? 'stage.completed' : 'stage.started';
        await stream.writeSSE({
          event: eventType,
          data: JSON.stringify({ stage: payload.name }),
        });
      }

      if (!finalState) throw new Error('Research stream ended without a final state.');
      await stream.writeSSE({
        event: 'run.completed',
        data: JSON.stringify(responseForResult(finalState, input.secDataMode)),
      });
    } catch (error) {
      await stream.writeSSE({
        event: 'run.failed',
        data: JSON.stringify({
          message: error instanceof Error ? error.message : 'Research stream failed.',
        }),
      });
    }
  });
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.info(`Research API listening on http://localhost:${port}`);
});
