import { z } from 'zod';

export const ResearchRequestSchema = z.object({
  ticker: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z.]{1,10}$/, 'Enter a valid U.S. ticker.'),
});

export const SourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string().url(),
  sourceType: z.enum(['sec_filing', 'market_data']),
  retrievedAt: z.string().datetime(),
});

export const FundamentalsSchema = z.object({
  fiscalYear: z.number().int(),
  revenueUsd: z.number(),
  netIncomeUsd: z.number(),
  operatingCashFlowUsd: z.number(),
});

export const ResearchMemoSchema = z.object({
  companySnapshot: z.string(),
  financialHighlights: z.array(z.string()),
  whatStandsOut: z.array(z.string()),
  risksAndLimitations: z.array(z.string()),
  sourceIdsUsed: z.array(z.string()),
  disclaimer: z.string(),
});

export const AnalystRoleSchema = z.enum(['fundamentals', 'business_quality', 'valuation']);

export const AnalystReportSchema = z.object({
  role: AnalystRoleSchema,
  thesis: z.string(),
  supportingEvidence: z.array(z.string()),
  concerns: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  sourceIdsUsed: z.array(z.string()),
});

export type ResearchRequest = z.infer<typeof ResearchRequestSchema>;
export type Source = z.infer<typeof SourceSchema>;
export type Fundamentals = z.infer<typeof FundamentalsSchema>;
export type ResearchMemo = z.infer<typeof ResearchMemoSchema>;
export type AnalystRole = z.infer<typeof AnalystRoleSchema>;
export type AnalystReport = z.infer<typeof AnalystReportSchema>;
