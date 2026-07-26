import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { createResearchGraphCatalog } from './research/graphs.js';
import { createResearchRoutes } from './research/routes.js';
import { PausedResearchRunStore } from './research/run-store.js';

type CreateAppOptions = {
  secContactEmail: string;
  modelEnvironment: Record<string, string | undefined>;
  isProduction: boolean;
};

export function createApp(options: CreateAppOptions) {
  const app = new Hono();
  const graphs = createResearchGraphCatalog(options);
  const runStore = new PausedResearchRunStore();

  app.use(
    '/*',
    cors({
      origin: 'http://localhost:5173',
      allowMethods: ['POST', 'GET'],
    }),
  );

  app.get('/health', (context) => context.json({ status: 'ok' }));
  app.route('/', createResearchRoutes({ graphs, runStore, isProduction: options.isProduction }));

  return app;
}
