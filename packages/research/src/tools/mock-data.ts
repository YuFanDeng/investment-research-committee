import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CompanyFactsResponse } from './sec-edgar.js';
import { SecEdgarError, selectFundamentals } from './sec-edgar.js';

const AAPL_FIXTURE_TICKER = 'AAPL';
const AAPL_FIXTURE_RETRIEVED_AT = '2026-07-23T00:00:00.000Z';
const AAPL_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json';
const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/sec/companyfacts/AAPL.json',
);

export class FixtureSecEdgarClient {
  async getFundamentals(ticker: string) {
    if (ticker.toUpperCase() !== AAPL_FIXTURE_TICKER) {
      throw new SecEdgarError(
        'No SEC fixture is available for this ticker. Use AAPL or switch to live mode.',
      );
    }

    let response: CompanyFactsResponse;
    try {
      response = JSON.parse(await readFile(fixturePath, 'utf8')) as CompanyFactsResponse;
    } catch {
      throw new SecEdgarError('The AAPL SEC fixture could not be loaded.');
    }

    return {
      companyName: response.entityName ?? 'Apple Inc.',
      fundamentals: selectFundamentals(response),
      source: {
        id: 'fixture-sec-company-facts-aapl',
        title: 'Apple Inc. — SEC EDGAR Company Facts (fixture)',
        url: AAPL_COMPANY_FACTS_URL,
        sourceType: 'sec_filing' as const,
        retrievedAt: AAPL_FIXTURE_RETRIEVED_AT,
      },
    };
  }
}
