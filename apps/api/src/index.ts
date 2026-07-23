import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  createResearchGraph,
  MockSecEdgarClient,
  ResearchRequestSchema,
} from '@investment-research/research';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const contactEmail = process.env.SEC_CONTACT_EMAIL;
if (!contactEmail) throw new Error('SEC_CONTACT_EMAIL must be configured.');

const useMockData = process.env.USE_MOCK_DATA?.toLowerCase() === 'true';

const app = new Hono();
const researchGraph = createResearchGraph({
  secContactEmail: contactEmail,
  modelEnvironment: { ...process.env },
  secClient: useMockData ? new MockSecEdgarClient() : undefined,
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
  const result = await researchGraph.invoke(input);

  return context.json({
    ticker: result.ticker,
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
