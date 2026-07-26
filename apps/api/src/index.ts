import dotenv from 'dotenv';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { serve } from '@hono/node-server';

import { createApp } from './app.js';

dotenv.config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const secContactEmail = process.env.SEC_CONTACT_EMAIL;
if (!secContactEmail) throw new Error('SEC_CONTACT_EMAIL must be configured.');

const port = Number(process.env.PORT ?? 8787);
const app = createApp({
  secContactEmail,
  modelEnvironment: { ...process.env },
  isProduction: process.env.NODE_ENV === 'production',
});

serve({ fetch: app.fetch, port }, () => {
  console.info(`Research API listening on http://localhost:${port}`);
});
