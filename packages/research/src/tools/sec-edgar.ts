import { type Fundamentals, type Source } from '../schemas.js';
import { z } from 'zod';

import { selectQuarterlyRevenue, type QuarterlyRevenue } from './sec-quarterly.js';

const SEC_TICKERS_URL = 'https://www.sec.gov/files/company_tickers.json';
const SEC_COMPANY_FACTS_URL = 'https://data.sec.gov/api/xbrl/companyfacts';
const SEC_SUBMISSIONS_URL = 'https://data.sec.gov/submissions';
const MIN_REQUEST_INTERVAL_MS = 150;

type TickerRecord = {
  cik_str: number;
  ticker: string;
  title: string;
};

export type CompanyFactsResponse = {
  entityName?: string;
  facts?: Record<string, Record<string, { units?: Record<string, SecFact[]> }>>;
};

export type SecFact = {
  accn?: string;
  end?: string;
  filed?: string;
  form?: string;
  fp?: string;
  fy?: number;
  start?: string;
  val?: number;
};

const SubmissionsResponseSchema = z.object({
  name: z.string().optional(),
  filings: z.object({
    recent: z.object({
      accessionNumber: z.array(z.string()),
      filingDate: z.array(z.string()),
      reportDate: z.array(z.string()),
      form: z.array(z.string()),
      primaryDocument: z.array(z.string()),
    }),
  }),
});

type AnnualFact = Required<Pick<SecFact, 'end' | 'filed' | 'start' | 'val'>>;

export type SecFundamentals = {
  companyName: string;
  fundamentals: Fundamentals;
  source: Source;
};

export type SecQuarterlyFundamentals = {
  companyName: string;
  fundamentals: QuarterlyRevenue[];
  source: Source;
};

export type SecFiling = {
  accessionNumber: string;
  filingDate: string;
  reportDate?: string;
  form: string;
  primaryDocument?: string;
  source: Source;
};

export type RecentSecFilings = {
  companyName: string;
  filings: SecFiling[];
};

export class SecEdgarError extends Error {}

let tickerRecordsPromise: Promise<TickerRecord[]> | undefined;
let lastRequestAt = 0;

function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isTickerRecord(value: unknown): value is TickerRecord {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.cik_str === 'number' &&
    typeof record.ticker === 'string' &&
    typeof record.title === 'string'
  );
}

function isCompanyFactsResponse(value: unknown): value is CompanyFactsResponse {
  return Boolean(value && typeof value === 'object');
}

function isAnnualUsdFact(value: SecFact): value is AnnualFact {
  const isAnnualForm = value.form === '10-K' || value.form === '20-F';
  if (
    !isAnnualForm ||
    value.fp !== 'FY' ||
    typeof value.val !== 'number' ||
    typeof value.filed !== 'string' ||
    typeof value.start !== 'string' ||
    typeof value.end !== 'string'
  ) {
    return false;
  }

  const durationInDays = (Date.parse(value.end) - Date.parse(value.start)) / 86_400_000;
  return durationInDays >= 300 && durationInDays <= 380;
}

function factsForTag(response: CompanyFactsResponse, tag: string) {
  return response.facts?.['us-gaap']?.[tag]?.units?.USD ?? [];
}

function latestAnnualFactByYear(response: CompanyFactsResponse, tags: string[]) {
  const annualFacts = new Map<string, AnnualFact>();

  for (const tag of tags) {
    for (const fact of factsForTag(response, tag)) {
      if (!isAnnualUsdFact(fact)) continue;
      const existing = annualFacts.get(fact.end);
      if (!existing || fact.filed > existing.filed) annualFacts.set(fact.end, fact);
    }
  }

  return annualFacts;
}

export function selectFundamentals(response: CompanyFactsResponse): Fundamentals {
  const revenue = latestAnnualFactByYear(response, [
    'Revenues',
    'RevenueFromContractWithCustomerExcludingAssessedTax',
    'SalesRevenueNet',
  ]);
  const netIncome = latestAnnualFactByYear(response, ['NetIncomeLoss']);
  const operatingCashFlow = latestAnnualFactByYear(response, [
    'NetCashProvidedByUsedInOperatingActivities',
  ]);

  const commonPeriodEnd = [...revenue.keys()]
    .filter((periodEnd) => netIncome.has(periodEnd) && operatingCashFlow.has(periodEnd))
    .sort((a, b) => b.localeCompare(a))[0];

  if (!commonPeriodEnd) {
    throw new SecEdgarError(
      'SEC EDGAR did not provide a complete annual revenue, net income, and operating cash flow set for this ticker.',
    );
  }

  return {
    fiscalYear: Number.parseInt(commonPeriodEnd.slice(0, 4), 10),
    revenueUsd: revenue.get(commonPeriodEnd)!.val,
    netIncomeUsd: netIncome.get(commonPeriodEnd)!.val,
    operatingCashFlowUsd: operatingCashFlow.get(commonPeriodEnd)!.val,
  };
}

export class SecEdgarClient {
  private readonly userAgent: string;

  constructor(contactEmail: string) {
    if (!contactEmail)
      throw new SecEdgarError('SEC_CONTACT_EMAIL must be configured before calling SEC EDGAR.');
    this.userAgent = `AlphaVerifier ${contactEmail}`;
  }

  private async requestJson(url: string): Promise<unknown> {
    const elapsed = Date.now() - lastRequestAt;
    if (elapsed < MIN_REQUEST_INTERVAL_MS) await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
    lastRequestAt = Date.now();

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': this.userAgent,
        },
      });
    } catch {
      throw new SecEdgarError('SEC EDGAR could not be reached. Please try again shortly.');
    }

    if (!response.ok) {
      throw new SecEdgarError(
        `SEC EDGAR returned ${response.status} while retrieving company data.`,
      );
    }

    return response.json();
  }

  private async tickerRecords() {
    tickerRecordsPromise ??= this.requestJson(SEC_TICKERS_URL).then((response) => {
      if (!response || typeof response !== 'object')
        throw new SecEdgarError('SEC EDGAR returned an invalid ticker mapping.');
      const records = Object.values(response).filter(isTickerRecord);
      if (!records.length) throw new SecEdgarError('SEC EDGAR returned an empty ticker mapping.');
      return records;
    });

    return tickerRecordsPromise;
  }

  private async resolveCompany(ticker: string) {
    const records = await this.tickerRecords();
    const company = records.find((record) => record.ticker.toUpperCase() === ticker.toUpperCase());

    if (!company) throw new SecEdgarError(`SEC EDGAR does not recognize the ticker ${ticker}.`);
    return { ...company, cik: String(company.cik_str).padStart(10, '0') };
  }

  async getFundamentals(ticker: string): Promise<SecFundamentals> {
    const company = await this.resolveCompany(ticker);
    const cik = company.cik;
    const sourceUrl = `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`;
    const response = await this.requestJson(sourceUrl);

    if (!isCompanyFactsResponse(response))
      throw new SecEdgarError('SEC EDGAR returned an invalid Company Facts response.');

    return {
      companyName: response.entityName ?? company.title,
      fundamentals: selectFundamentals(response),
      source: {
        id: `sec-company-facts-${cik}`,
        title: `${response.entityName ?? company.title} — SEC EDGAR Company Facts`,
        url: sourceUrl,
        sourceType: 'sec_filing',
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  async getQuarterlyFundamentals(ticker: string, periods = 8): Promise<SecQuarterlyFundamentals> {
    const company = await this.resolveCompany(ticker);
    const cik = company.cik;
    const sourceUrl = `${SEC_COMPANY_FACTS_URL}/CIK${cik}.json`;
    const response = await this.requestJson(sourceUrl);

    if (!isCompanyFactsResponse(response))
      throw new SecEdgarError('SEC EDGAR returned an invalid Company Facts response.');

    return {
      companyName: response.entityName ?? company.title,
      fundamentals: selectQuarterlyRevenue(response, periods),
      source: {
        id: `sec-company-facts-${cik}`,
        title: `${response.entityName ?? company.title} — SEC EDGAR Company Facts`,
        url: sourceUrl,
        sourceType: 'sec_filing',
        retrievedAt: new Date().toISOString(),
      },
    };
  }

  async getRecentFilings(
    ticker: string,
    formTypes: string[] = ['10-K', '10-Q', '8-K'],
    limit = 5,
  ): Promise<RecentSecFilings> {
    const company = await this.resolveCompany(ticker);
    const response = SubmissionsResponseSchema.parse(
      await this.requestJson(`${SEC_SUBMISSIONS_URL}/CIK${company.cik}.json`),
    );
    const recent = response.filings.recent;
    const filings: SecFiling[] = [];

    for (let index = 0; index < recent.accessionNumber.length; index += 1) {
      const form = recent.form[index];
      if (!form || !formTypes.includes(form)) continue;

      const accessionNumber = recent.accessionNumber[index];
      const filingDate = recent.filingDate[index];
      if (!accessionNumber || !filingDate) continue;

      const primaryDocument = recent.primaryDocument[index];
      const archivePath = `${company.cik_str}/${accessionNumber.replaceAll('-', '')}`;
      const url = primaryDocument
        ? `https://www.sec.gov/Archives/edgar/data/${archivePath}/${primaryDocument}`
        : `https://www.sec.gov/Archives/edgar/data/${archivePath}/`;

      filings.push({
        accessionNumber,
        filingDate,
        reportDate: recent.reportDate[index] || undefined,
        form,
        primaryDocument: primaryDocument || undefined,
        source: {
          id: `sec-filing-${accessionNumber}`,
          title: `${response.name ?? company.title} — ${form} filed ${filingDate}`,
          url,
          sourceType: 'sec_filing',
          retrievedAt: new Date().toISOString(),
        },
      });

      if (filings.length >= limit) break;
    }

    return { companyName: response.name ?? company.title, filings };
  }
}
