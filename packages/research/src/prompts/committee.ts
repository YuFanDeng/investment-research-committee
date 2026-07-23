import type {
  AnalystRole,
  Fundamentals,
  MarketSnapshot,
  ResearchMemo,
  Source,
} from '../schemas.js';

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
  marketSnapshot?: MarketSnapshot;
  sources: Source[];
};

export type CommitteeMessage = ['system' | 'human', string];

type MarketSummary = Omit<MarketSnapshot, 'historicalCloses'> & {
  metrics: {
    oneYearReturn?: number;
    annualizedVolatility?: number;
    maximumDrawdown?: number;
    periodHigh?: number;
    periodLow?: number;
  };
};

function summarizeMarketSnapshot(snapshot?: MarketSnapshot): MarketSummary | undefined {
  if (!snapshot) return undefined;

  const closes = snapshot.historicalCloses.map((bar) => bar.close);
  const { historicalCloses: _historicalCloses, ...compactSnapshot } = snapshot;
  const returns = closes.slice(1).flatMap((close, index) => {
    const previousClose = closes[index];
    return previousClose ? [(close - previousClose) / previousClose] : [];
  });
  const averageReturn = returns.length
    ? returns.reduce((sum, value) => sum + value, 0) / returns.length
    : undefined;
  const variance =
    averageReturn === undefined
      ? undefined
      : returns.reduce((sum, value) => sum + (value - averageReturn) ** 2, 0) / returns.length;
  let peak = closes[0];
  let maximumDrawdown = 0;

  for (const close of closes) {
    if (typeof peak !== 'number' || close > peak) peak = close;
    if (peak) maximumDrawdown = Math.min(maximumDrawdown, (close - peak) / peak);
  }

  return {
    ...compactSnapshot,
    metrics: {
      oneYearReturn:
        closes.length > 1 && closes[0] ? (closes.at(-1)! - closes[0]) / closes[0] : undefined,
      annualizedVolatility:
        variance === undefined ? undefined : Math.sqrt(variance) * Math.sqrt(252),
      maximumDrawdown,
      periodHigh: closes.length ? Math.max(...closes) : undefined,
      periodLow: closes.length ? Math.min(...closes) : undefined,
    },
  };
}

function serializeEvidence<T extends CommitteeEvidence>(evidence: T) {
  return { ...evidence, marketSnapshot: summarizeMarketSnapshot(evidence.marketSnapshot) };
}

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
      `Analyze ${evidence.ticker} as the ${role} analyst. Return a thesis, supporting evidence, concerns, confidence from 0 to 1, and source IDs used. Evidence:\n\n${JSON.stringify(serializeEvidence(evidence), null, 2)}`,
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
      `Synthesize this committee review for ${evidence.ticker}:\n\n${JSON.stringify(serializeEvidence(evidence), null, 2)}`,
    ],
  ];
}

export function buildSkepticMessages(
  evidence: ChairEvidence & { draftMemo: ResearchMemo },
): CommitteeMessage[] {
  return [
    [
      'system',
      'You are the skeptic and quality reviewer for an equity research committee. Try to disprove the chair draft. Identify unsupported claims, missing evidence, contradictions, key risks, and concrete revisions. Do not invent facts.',
    ],
    [
      'human',
      `Challenge this committee draft for ${evidence.ticker}:\n\n${JSON.stringify(serializeEvidence(evidence), null, 2)}`,
    ],
  ];
}

export function buildFinalChairMessages(
  evidence: ChairEvidence & { draftMemo: ResearchMemo; challengeReport: unknown },
): CommitteeMessage[] {
  return [
    [
      'system',
      'You are the final chair of an equity research committee. Revise the draft using the skeptic challenge. Preserve uncertainty, use only supplied evidence, and do not provide personalized investment advice. Return only the requested structured memo.',
    ],
    [
      'human',
      `Produce the final committee memo for ${evidence.ticker}:\n\n${JSON.stringify(serializeEvidence(evidence), null, 2)}`,
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
