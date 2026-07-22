import type { AnalystRole, Fundamentals, ResearchMemo, Source } from '../schemas.js';

export const ANALYST_SYSTEM_PROMPTS: Record<AnalystRole, string> = {
  fundamentals:
    'You are the fundamentals analyst on an equity research committee. Assess reported financial performance only. Do not invent trends or metrics that are not present in the evidence.',
  business_quality:
    'You are the business quality analyst on an equity research committee. Assess business durability and operating strengths only from the supplied evidence. Call out what cannot be concluded from the limited evidence.',
  valuation:
    'You are the valuation analyst on an equity research committee. Assess valuation implications conservatively. If price, multiples, or peer data are missing, explicitly say valuation cannot yet be determined and do not invent numbers.',
};

export type CommitteeEvidence = {
  ticker: string;
  companyName?: string;
  fundamentals: Fundamentals;
  sources: Source[];
};

export type CommitteeMessage = ['system' | 'human', string];

export function buildAnalystMessages(
  role: AnalystRole,
  evidence: CommitteeEvidence,
): CommitteeMessage[] {
  return [
    [
      'system',
      `${ANALYST_SYSTEM_PROMPTS[role]} Return a structured report grounded in source IDs.`,
    ],
    [
      'human',
      `Analyze ${evidence.ticker} as the ${role} analyst. Return a thesis, supporting evidence, concerns, confidence from 0 to 1, and source IDs used. Evidence:\n\n${JSON.stringify(evidence, null, 2)}`,
    ],
  ];
}

export type ChairEvidence = CommitteeEvidence & { analystReports: unknown[] };

export function buildChairMessages(evidence: ChairEvidence): CommitteeMessage[] {
  return [
    [
      'system',
      'You are the chair of an equity research committee. Synthesize the analyst reports into a concise, balanced fundamentals memo. Use only supplied evidence, preserve uncertainty, and do not provide personalized investment advice. Return only the requested structured memo.',
    ],
    [
      'human',
      `Synthesize this committee review for ${evidence.ticker}:\n\n${JSON.stringify(evidence, null, 2)}`,
    ],
  ];
}

export function buildFallbackAnalystReport(
  role: AnalystRole,
  evidence: CommitteeEvidence,
): import('../schemas.js').AnalystReport {
  const { fundamentals, sources, ticker } = evidence;
  const sourceIdsUsed = sources.map((source) => source.id);

  const roleDetails: Record<
    AnalystRole,
    Pick<ResearchMemo, 'financialHighlights' | 'risksAndLimitations'>
  > = {
    fundamentals: {
      financialHighlights: [
        `FY${fundamentals.fiscalYear} revenue: $${(fundamentals.revenueUsd / 1_000_000_000).toFixed(1)}B.`,
        `FY${fundamentals.fiscalYear} net income: $${(fundamentals.netIncomeUsd / 1_000_000_000).toFixed(1)}B.`,
      ],
      risksAndLimitations: [
        'Only a single annual fundamentals snapshot is available for this analyst.',
      ],
    },
    business_quality: {
      financialHighlights: [
        'SEC fundamentals provide an initial view of operating scale and cash generation.',
      ],
      risksAndLimitations: [
        'Business quality requires selected 10-K and 10-Q narrative sections for stronger conclusions.',
      ],
    },
    valuation: {
      financialHighlights: [
        'Operating cash flow is available as a potential input to future valuation work.',
      ],
      risksAndLimitations: [
        'Market price, valuation multiples, and peer data were not supplied; valuation cannot yet be determined.',
      ],
    },
  };

  return {
    role,
    thesis: `${ticker} requires additional evidence before the ${role.replace('_', ' ')} view can be stated with confidence.`,
    supportingEvidence: roleDetails[role].financialHighlights,
    concerns: roleDetails[role].risksAndLimitations,
    confidence: 0.25,
    sourceIdsUsed,
  };
}
