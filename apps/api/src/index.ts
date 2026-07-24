import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
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

  const graph = input.secDataMode === 'fixture' ? fixtureResearchGraph : liveResearchGraph;
  const result = await graph.invoke(input);

  return context.json({
    ticker: result.ticker,
    secDataMode: input.secDataMode,
    companyName: result.companyName,
    status: result.status,
    fundamentals: result.fundamentals,
    marketSnapshot: result.marketSnapshot,
    analystReports: result.analystReports,
    challengeReport: result.challengeReport,
    memo: result.memo,
    sources: result.sources,
    errors: result.errors,
  });
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.info(`Research API listening on http://localhost:${port}`);
});
