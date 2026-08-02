import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { CompanyFactsResponse, SecFiling } from './sec-edgar.js';
import { SecEdgarError, selectFundamentals } from './sec-edgar.js';
import { selectQuarterlyRevenue } from './sec-quarterly.js';

const AAPL_FIXTURE_TICKER = 'AAPL';
const AAPL_FIXTURE_RETRIEVED_AT = '2026-07-23T00:00:00.000Z';
const AAPL_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json';
const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../fixtures/sec/companyfacts/AAPL.json',
);

export class FixtureSecEdgarClient {
  private async loadCompanyFacts(ticker: string) {
    if (ticker.toUpperCase() !== AAPL_FIXTURE_TICKER) {
      throw new SecEdgarError(
        'No SEC fixture is available for this ticker. Use AAPL or switch to live mode.',
      );
    }

    try {
      return JSON.parse(await readFile(fixturePath, 'utf8')) as CompanyFactsResponse;
    } catch {
      throw new SecEdgarError('The AAPL SEC fixture could not be loaded.');
    }
  }

  async getFundamentals(ticker: string) {
    const response = await this.loadCompanyFacts(ticker);

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

  async getQuarterlyFundamentals(ticker: string, periods = 8) {
    const response = await this.loadCompanyFacts(ticker);

    return {
      companyName: response.entityName ?? 'Apple Inc.',
      fundamentals: selectQuarterlyRevenue(response, periods),
      source: {
        id: 'fixture-sec-company-facts-aapl',
        title: 'Apple Inc. — SEC EDGAR Company Facts (fixture)',
        url: AAPL_COMPANY_FACTS_URL,
        sourceType: 'sec_filing' as const,
        retrievedAt: AAPL_FIXTURE_RETRIEVED_AT,
      },
    };
  }

  async getRecentFilings(ticker: string, formTypes: string[] = ['10-K', '10-Q', '8-K'], limit = 5) {
    const response = await this.loadCompanyFacts(ticker);
    const filingsByAccession = new Map<string, SecFiling>();

    for (const namespace of Object.values(response.facts ?? {})) {
      for (const fact of Object.values(namespace)) {
        for (const unit of Object.values(fact.units ?? {})) {
          for (const item of unit) {
            if (!item.accn || !item.form || !item.filed || !formTypes.includes(item.form)) continue;
            const archivePath = `320193/${item.accn.replaceAll('-', '')}`;
            filingsByAccession.set(item.accn, {
              accessionNumber: item.accn,
              filingDate: item.filed,
              reportDate: item.end,
              form: item.form,
              source: {
                id: `fixture-sec-filing-${item.accn}`,
                title: `Apple Inc. — ${item.form} filed ${item.filed} (fixture)`,
                url: `https://www.sec.gov/Archives/edgar/data/${archivePath}/`,
                sourceType: 'sec_filing',
                retrievedAt: AAPL_FIXTURE_RETRIEVED_AT,
              },
            });
          }
        }
      }
    }

    const filings = [...filingsByAccession.values()]
      .sort((left, right) => right.filingDate.localeCompare(left.filingDate))
      .slice(0, limit);

    return { companyName: response.entityName ?? 'Apple Inc.', filings };
  }
}
