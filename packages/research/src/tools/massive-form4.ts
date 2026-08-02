import { z } from 'zod';

import type { Source } from '../schemas.js';

const DEFAULT_BASE_URL = 'https://api.massive.com';

const NullableStringSchema = z.string().nullish();
const NullableNumberSchema = z.number().nullish();
const NullableBooleanSchema = z.boolean().nullish();

const Form4FootnoteSchema = z.object({
  id: z.string().optional(),
  description: z.string().optional(),
});

const Form4RecordSchema = z.object({
  accession_number: NullableStringSchema,
  aff_10b5_one: NullableBooleanSchema,
  date_of_original_submission: NullableStringSchema,
  deemed_execution_date: NullableStringSchema,
  direct_or_indirect: NullableStringSchema,
  equity_swap_involved: NullableBooleanSchema,
  exercise_date: NullableStringSchema,
  exercise_price: NullableNumberSchema,
  expiration_date: NullableStringSchema,
  filing_date: NullableStringSchema,
  filing_url: NullableStringSchema,
  footnotes: z.array(Form4FootnoteSchema).nullish(),
  form_type: NullableStringSchema,
  is_director: NullableBooleanSchema,
  is_officer: NullableBooleanSchema,
  is_other: NullableBooleanSchema,
  is_ten_percent_owner: NullableBooleanSchema,
  issuer_cik: NullableStringSchema,
  issuer_name: NullableStringSchema,
  nature_of_ownership: NullableStringSchema,
  not_subject_to_section_16: NullableBooleanSchema,
  officer_title: NullableStringSchema,
  owner_cik: NullableStringSchema,
  owner_name: NullableStringSchema,
  period_of_report: NullableStringSchema,
  record_type: NullableStringSchema,
  remarks: NullableStringSchema,
  security_title: NullableStringSchema,
  security_type: NullableStringSchema,
  shares_owned_following_transaction: NullableNumberSchema,
  tickers: z.array(z.string()).nullish(),
  transaction_acquired_disposed: NullableStringSchema,
  transaction_code: NullableStringSchema,
  transaction_date: NullableStringSchema,
  transaction_price_per_share: NullableNumberSchema,
  transaction_shares: NullableNumberSchema,
  transaction_timeliness: NullableStringSchema,
  transaction_value: NullableNumberSchema,
  underlying_security_shares: NullableNumberSchema,
  underlying_security_title: NullableStringSchema,
});

const Form4ResponseSchema = z.object({
  next_url: z.string().nullish(),
  request_id: z.string().optional(),
  results: z.array(Form4RecordSchema).default([]),
  status: z.string().optional(),
});

export const FORM4_TRANSACTION_CODES = [
  'A',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'O',
  'P',
  'S',
  'U',
  'V',
  'W',
  'X',
  'Z',
] as const;

export type Form4TransactionCode = (typeof FORM4_TRANSACTION_CODES)[number];

export type MassiveForm4Query = {
  issuerCik?: string;
  ownerCik?: string;
  ticker?: string;
  formType?: '4' | '4/A';
  filingDateFrom?: string;
  filingDateTo?: string;
  transactionCode?: Form4TransactionCode;
  limit?: number;
  sort?: string;
};

export type InsiderTransaction = {
  accessionNumber?: string;
  originalSubmissionDate?: string;
  filingDate?: string;
  filingUrl?: string;
  formType?: string;
  issuerCik?: string;
  issuerName?: string;
  tickers: string[];
  ownerCik?: string;
  ownerName?: string;
  officerTitle?: string;
  roles: Array<'director' | 'officer' | 'ten_percent_owner' | 'other'>;
  transactionDate?: string;
  deemedExecutionDate?: string;
  transactionCode?: string;
  acquiredOrDisposed?: 'acquired' | 'disposed' | 'not_disclosed';
  shares?: number;
  pricePerShare?: number;
  value?: number;
  sharesOwnedAfter?: number;
  securityTitle?: string;
  securityType?: string;
  underlyingSecurityTitle?: string;
  underlyingShares?: number;
  exerciseDate?: string;
  exercisePrice?: number;
  expirationDate?: string;
  planStatus: 'reported_10b5_1' | 'reported_not_10b5_1' | 'not_disclosed';
  ownershipType: 'direct' | 'indirect' | 'not_disclosed';
  natureOfOwnership?: string;
  filingTimeliness?: 'on_time' | 'late' | 'not_disclosed';
  equitySwapInvolved?: boolean;
  notSubjectToSection16?: boolean;
  footnotes: Array<{ id?: string; description?: string }>;
  remarks?: string;
  recordType?: string;
};

export type InsiderTransactionResult = {
  transactions: InsiderTransaction[];
  nextUrl?: string;
  sources: Source[];
};

type MassiveForm4ClientOptions = {
  apiKey?: string;
  baseUrl?: string;
  fetcher?: typeof fetch;
};

export class MassiveForm4Error extends Error {}

function optional<T>(value: T | null | undefined) {
  return value ?? undefined;
}

function normalizePlanStatus(value: boolean | null | undefined) {
  if (value === true) return 'reported_10b5_1' as const;
  if (value === false) return 'reported_not_10b5_1' as const;
  return 'not_disclosed' as const;
}

function normalizeOwnershipType(value: string | null | undefined) {
  if (value === 'D') return 'direct' as const;
  if (value === 'I') return 'indirect' as const;
  return 'not_disclosed' as const;
}

function normalizeDirection(value: string | null | undefined) {
  if (value === 'A') return 'acquired' as const;
  if (value === 'D') return 'disposed' as const;
  return 'not_disclosed' as const;
}

function normalizeTimeliness(value: string | null | undefined) {
  if (value === 'O') return 'on_time' as const;
  if (value === 'L') return 'late' as const;
  return 'not_disclosed' as const;
}

function normalizeRoles(record: z.infer<typeof Form4RecordSchema>) {
  const roles: InsiderTransaction['roles'] = [];
  if (record.is_director) roles.push('director');
  if (record.is_officer) roles.push('officer');
  if (record.is_ten_percent_owner) roles.push('ten_percent_owner');
  if (record.is_other) roles.push('other');
  return roles;
}

function normalizeTransaction(record: z.infer<typeof Form4RecordSchema>): InsiderTransaction {
  return {
    accessionNumber: optional(record.accession_number),
    originalSubmissionDate: optional(record.date_of_original_submission),
    filingDate: optional(record.filing_date),
    filingUrl: optional(record.filing_url),
    formType: optional(record.form_type),
    issuerCik: optional(record.issuer_cik),
    issuerName: optional(record.issuer_name),
    tickers: record.tickers ?? [],
    ownerCik: optional(record.owner_cik),
    ownerName: optional(record.owner_name),
    officerTitle: optional(record.officer_title),
    roles: normalizeRoles(record),
    transactionDate: optional(record.transaction_date),
    deemedExecutionDate: optional(record.deemed_execution_date),
    transactionCode: optional(record.transaction_code),
    acquiredOrDisposed: normalizeDirection(record.transaction_acquired_disposed),
    shares: optional(record.transaction_shares),
    pricePerShare: optional(record.transaction_price_per_share),
    value: optional(record.transaction_value),
    sharesOwnedAfter: optional(record.shares_owned_following_transaction),
    securityTitle: optional(record.security_title),
    securityType: optional(record.security_type),
    underlyingSecurityTitle: optional(record.underlying_security_title),
    underlyingShares: optional(record.underlying_security_shares),
    exerciseDate: optional(record.exercise_date),
    exercisePrice: optional(record.exercise_price),
    expirationDate: optional(record.expiration_date),
    planStatus: normalizePlanStatus(record.aff_10b5_one),
    ownershipType: normalizeOwnershipType(record.direct_or_indirect),
    natureOfOwnership: optional(record.nature_of_ownership),
    filingTimeliness: normalizeTimeliness(record.transaction_timeliness),
    equitySwapInvolved: optional(record.equity_swap_involved),
    notSubjectToSection16: optional(record.not_subject_to_section_16),
    footnotes: record.footnotes ?? [],
    remarks: optional(record.remarks),
    recordType: optional(record.record_type),
  };
}

function sourceForTransaction(transaction: InsiderTransaction): Source | undefined {
  if (!transaction.accessionNumber) return undefined;
  const filingUrl =
    transaction.filingUrl ??
    (transaction.issuerCik
      ? `https://www.sec.gov/Archives/edgar/data/${Number.parseInt(transaction.issuerCik, 10)}/${transaction.accessionNumber.replaceAll('-', '')}/${transaction.accessionNumber}.txt`
      : undefined);
  if (!filingUrl) return undefined;
  return {
    id: `sec-form4-${transaction.accessionNumber}`,
    title: `${transaction.issuerName ?? transaction.tickers[0] ?? 'Company'} — Form ${transaction.formType ?? '4'} filed ${transaction.filingDate ?? 'date unavailable'}`,
    url: filingUrl,
    sourceType: 'sec_filing',
    retrievedAt: new Date().toISOString(),
  };
}

export class MassiveForm4Client {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  constructor(options: MassiveForm4ClientOptions = {}) {
    if (!options.apiKey) throw new MassiveForm4Error('MASSIVE_API_KEY must be configured.');
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetcher = options.fetcher ?? fetch;
  }

  async getTransactions(query: MassiveForm4Query): Promise<InsiderTransactionResult> {
    const url = new URL('/stocks/filings/vX/form-4', this.baseUrl);
    if (query.issuerCik) url.searchParams.set('issuer_cik', query.issuerCik);
    if (query.ownerCik) url.searchParams.set('owner_cik', query.ownerCik);
    if (query.ticker) url.searchParams.set('tickers', query.ticker.toUpperCase());
    if (query.formType) url.searchParams.set('form_type', query.formType);
    if (query.filingDateFrom) url.searchParams.set('filing_date.gte', query.filingDateFrom);
    if (query.filingDateTo) url.searchParams.set('filing_date.lte', query.filingDateTo);
    if (query.transactionCode) url.searchParams.set('transaction_code', query.transactionCode);
    if (query.limit) url.searchParams.set('limit', String(query.limit));
    if (query.sort) url.searchParams.set('sort', query.sort);
    url.searchParams.set('apiKey', this.apiKey);

    let response: Response;
    try {
      response = await this.fetcher(url);
    } catch {
      throw new MassiveForm4Error('Massive Form 4 data could not be reached.');
    }

    if (!response.ok) {
      throw new MassiveForm4Error(
        `Massive returned ${response.status} while retrieving Form 4 data.`,
      );
    }

    const parsed = Form4ResponseSchema.safeParse(await response.json());
    if (!parsed.success) throw new MassiveForm4Error('Massive returned invalid Form 4 data.');

    const transactions = parsed.data.results.map(normalizeTransaction);
    const sourcesById = new Map<string, Source>();
    for (const transaction of transactions) {
      const source = sourceForTransaction(transaction);
      if (source) sourcesById.set(source.id, source);
    }

    return {
      transactions,
      nextUrl: optional(parsed.data.next_url),
      sources: [...sourcesById.values()],
    };
  }
}
