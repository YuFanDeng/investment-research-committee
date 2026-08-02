import { tool } from '@langchain/core/tools';
import { z } from 'zod';

import { FORM4_TRANSACTION_CODES } from '../../tools/massive-form4.js';
import { AssistantTickerSchema } from '../schemas.js';
import type { ResearchToolContext } from './context.js';
import {
  compactInsiderTransaction,
  compareInsiderTransactions,
  matchesOwnershipFilters,
  summarizeInsiderTransactions,
} from './ownership-analysis.js';

const MAX_PROVIDER_RECORDS = 250;
const DEFAULT_RESULT_LIMIT = 8;

const IsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.');
const CikSchema = z.string().regex(/^\d{10}$/, 'Use a 10-digit, zero-padded SEC CIK.');

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dateDaysBefore(date: string, days: number) {
  const start = new Date(`${date}T00:00:00.000Z`);
  start.setUTCDate(start.getUTCDate() - days);
  return isoDate(start);
}

export function createOwnershipResearchTools(context: ResearchToolContext) {
  const getInsiderTransactions = tool(
    async ({
      ticker,
      issuerCik,
      ownerCik,
      lookbackDays,
      filingDateFrom,
      filingDateTo,
      transactionCodes,
      formType,
      ownershipType,
      planStatus,
      securityType,
      insiderRoles,
      sortBy,
      sortOrder,
      limit,
    }) => {
      const effectiveDateTo = filingDateTo ?? isoDate(new Date());
      const effectiveDateFrom = filingDateFrom ?? dateDaysBefore(effectiveDateTo, lookbackDays);
      const providerTransactionCode =
        transactionCodes?.length === 1 ? transactionCodes[0] : undefined;
      // The beta endpoint currently accepts filing_date for server-side sorting. Other supported
      // presentation orders are applied deterministically after retrieving the latest records.
      const providerSort = sortBy === 'filing_date' ? `${sortBy}.${sortOrder}` : 'filing_date.desc';
      const result = await context.getInsiderTransactions({
        ticker,
        issuerCik,
        ownerCik,
        formType: formType === 'original' ? '4' : formType === 'amendment' ? '4/A' : undefined,
        filingDateFrom: effectiveDateFrom,
        filingDateTo: effectiveDateTo,
        transactionCode: providerTransactionCode,
        limit: MAX_PROVIDER_RECORDS,
        sort: providerSort,
      });

      const filteredTransactions = result.transactions
        .filter((transaction) =>
          matchesOwnershipFilters(transaction, {
            transactionCodes,
            ownershipType,
            planStatus,
            securityType,
            insiderRoles,
          }),
        )
        .sort((left, right) => compareInsiderTransactions(left, right, { sortBy, sortOrder }));
      const returnedTransactions = filteredTransactions.slice(0, limit);
      const returnedAccessions = new Set(
        returnedTransactions
          .map((transaction) => transaction.accessionNumber)
          .filter((accession): accession is string => Boolean(accession)),
      );
      const returnedSources = result.sources.filter((source) =>
        [...returnedAccessions].some((accession) => source.id === `sec-form4-${accession}`),
      );
      const returnedSourceIds = new Set(returnedSources.map((source) => source.id));
      returnedSources.forEach(context.collectSource);

      return JSON.stringify({
        ticker,
        query: {
          issuerCik,
          ownerCik,
          filingDateFrom: effectiveDateFrom,
          filingDateTo: effectiveDateTo,
          transactionCodes,
          formType,
          ownershipType,
          planStatus,
          securityType,
          insiderRoles,
          sortBy,
          sortOrder,
          limit,
        },
        recordsScanned: result.transactions.length,
        matchedTransactionCount: filteredTransactions.length,
        providerResultTruncated: Boolean(result.nextUrl),
        summaryScope: 'returned_transactions',
        summary: summarizeInsiderTransactions(returnedTransactions),
        transactions: returnedTransactions.map((transaction) =>
          compactInsiderTransaction(transaction, returnedSourceIds),
        ),
        sourceIds: [...returnedSourceIds],
        interpretationNotes: [
          'A reported 10b5-1 plan is context, not proof of an insider’s motivation.',
          'Indirect ownership still represents reported beneficial ownership through another person or entity.',
          'Grant, exercise, withholding, and gift transactions are not equivalent to open-market purchases or sales.',
          'Amendments can correct or repeat an original filing; combined results should not be treated as deduplicated transactions.',
        ],
      });
    },
    {
      name: 'get_insider_transactions',
      description:
        'Research SEC Form 4 insider transactions for a company. Supports filing-date windows, transaction codes, amendments, a reporting-owner CIK, direct or indirect ownership, Rule 10b5-1 status, derivative or non-derivative securities, insider roles, value/date sorting, and bounded results. Use this for insider purchases, sales, grants, exercises, gifts, ownership method, or planned-trade questions.',
      schema: z
        .object({
          ticker: AssistantTickerSchema,
          issuerCik: CikSchema.optional(),
          ownerCik: CikSchema.optional(),
          lookbackDays: z.number().int().min(1).max(730).default(90),
          filingDateFrom: IsoDateSchema.optional(),
          filingDateTo: IsoDateSchema.optional(),
          transactionCodes: z.array(z.enum(FORM4_TRANSACTION_CODES)).min(1).max(8).optional(),
          formType: z.enum(['original', 'amendment', 'both']).default('original'),
          ownershipType: z.enum(['all', 'direct', 'indirect', 'not_disclosed']).default('all'),
          planStatus: z
            .enum(['all', 'reported_10b5_1', 'reported_not_10b5_1', 'not_disclosed'])
            .default('all'),
          securityType: z.enum(['all', 'derivative', 'non-derivative']).default('all'),
          insiderRoles: z
            .array(z.enum(['director', 'officer', 'ten_percent_owner', 'other']))
            .min(1)
            .max(4)
            .optional(),
          sortBy: z
            .enum(['filing_date', 'transaction_date', 'transaction_value'])
            .default('transaction_date'),
          sortOrder: z.enum(['asc', 'desc']).default('desc'),
          limit: z.number().int().min(1).max(12).default(DEFAULT_RESULT_LIMIT),
        })
        .superRefine((value, context) => {
          if (
            value.filingDateFrom &&
            value.filingDateTo &&
            value.filingDateFrom > value.filingDateTo
          ) {
            context.addIssue({
              code: z.ZodIssueCode.custom,
              path: ['filingDateTo'],
              message: 'The ending filing date must not be before the starting filing date.',
            });
          }
        }),
    },
  );

  return [getInsiderTransactions];
}
