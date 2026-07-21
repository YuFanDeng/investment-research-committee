import 'dotenv/config';

import { serve } from '@hono/node-server';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { ResearchRequestSchema, createResearchGraph } from '@investment-research/research';

const contactEmail = process.env.SEC_CONTACT_EMAIL;
if (!contactEmail) throw new Error('SEC_CONTACT_EMAIL must be configured.');

const app = new Hono();
const researchGraph = createResearchGraph({ secContactEmail: contactEmail });

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
    status: result.status,
    memo: result.memo,
    sources: result.sources,
    errors: result.errors,
  });
});

const port = Number(process.env.PORT ?? 8787);

serve({ fetch: app.fetch, port }, () => {
  console.info(`Research API listening on http://localhost:${port}`);
});
