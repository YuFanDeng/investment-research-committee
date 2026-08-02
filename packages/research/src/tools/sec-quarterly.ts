import type { CompanyFactsResponse, SecFact } from './sec-edgar.js';

const DAY_MS = 86_400_000;
const REVENUE_TAGS = [
  'RevenueFromContractWithCustomerExcludingAssessedTax',
  'Revenues',
  'SalesRevenueNet',
];

type CompleteRevenueFact = Required<
  Pick<SecFact, 'end' | 'filed' | 'form' | 'fp' | 'start' | 'val'>
> &
  Pick<SecFact, 'fy'>;

export type QuarterlyRevenue = {
  fiscalYear: number;
  fiscalQuarter: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  periodStart: string;
  periodEnd: string;
  revenueUsd: number;
  changeFromPreviousQuarterPct?: number;
  changeYearOverYearPct?: number;
  derivation: 'reported' | 'derived_from_annual_and_nine_months';
};

function durationInDays(fact: Pick<CompleteRevenueFact, 'start' | 'end'>) {
  return (Date.parse(fact.end) - Date.parse(fact.start)) / DAY_MS;
}

function isCompleteRevenueFact(fact: SecFact): fact is CompleteRevenueFact {
  return (
    typeof fact.end === 'string' &&
    typeof fact.filed === 'string' &&
    typeof fact.form === 'string' &&
    typeof fact.fp === 'string' &&
    typeof fact.start === 'string' &&
    typeof fact.val === 'number'
  );
}

function isFiledNearPeriodEnd(fact: CompleteRevenueFact) {
  const filingDelay = (Date.parse(fact.filed) - Date.parse(fact.end)) / DAY_MS;
  return filingDelay >= 0 && filingDelay <= 180;
}

function choosePreferredFact(facts: CompleteRevenueFact[]) {
  const timelyFacts = facts.filter(isFiledNearPeriodEnd);
  const candidates = timelyFacts.length ? timelyFacts : facts;

  return candidates.sort((left, right) => right.filed.localeCompare(left.filed))[0];
}

function revenueFacts(response: CompanyFactsResponse) {
  const groupedFacts = new Map<string, CompleteRevenueFact[]>();

  for (const tag of REVENUE_TAGS) {
    const facts = response.facts?.['us-gaap']?.[tag]?.units?.USD ?? [];
    for (const fact of facts) {
      if (!isCompleteRevenueFact(fact)) continue;
      const key = `${fact.start}:${fact.end}:${fact.fp}`;
      const candidates = groupedFacts.get(key) ?? [];
      candidates.push(fact);
      groupedFacts.set(key, candidates);
    }
  }

  return [...groupedFacts.values()].map(choosePreferredFact);
}

function reportedQuarters(facts: CompleteRevenueFact[]): QuarterlyRevenue[] {
  return facts
    .filter((fact) => {
      const isQuarterlyForm = fact.form === '10-Q' || fact.form === '10-Q/A';
      const isQuarter = fact.fp === 'Q1' || fact.fp === 'Q2' || fact.fp === 'Q3';
      const duration = durationInDays(fact);
      return isQuarterlyForm && isQuarter && duration >= 70 && duration <= 120;
    })
    .map((fact) => ({
      fiscalYear: fact.fy ?? Number.parseInt(fact.end.slice(0, 4), 10),
      fiscalQuarter: fact.fp as 'Q1' | 'Q2' | 'Q3',
      periodStart: fact.start,
      periodEnd: fact.end,
      revenueUsd: fact.val,
      derivation: 'reported' as const,
    }));
}

function dayAfter(date: string) {
  const nextDay = new Date(`${date}T00:00:00.000Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);
  return nextDay.toISOString().slice(0, 10);
}

function derivedFourthQuarters(facts: CompleteRevenueFact[]): QuarterlyRevenue[] {
  const annualFacts = facts.filter((fact) => {
    const isAnnualForm = fact.form === '10-K' || fact.form === '10-K/A';
    const duration = durationInDays(fact);
    return isAnnualForm && fact.fp === 'FY' && duration >= 300 && duration <= 380;
  });

  const nineMonthFacts = facts.filter((fact) => {
    const isQuarterlyForm = fact.form === '10-Q' || fact.form === '10-Q/A';
    const duration = durationInDays(fact);
    return isQuarterlyForm && fact.fp === 'Q3' && duration >= 240 && duration <= 300;
  });

  return annualFacts.flatMap((annualFact) => {
    const nineMonthFact = nineMonthFacts.find(
      (candidate) =>
        candidate.start === annualFact.start && candidate.end.localeCompare(annualFact.end) < 0,
    );

    if (!nineMonthFact) return [];

    return [
      {
        fiscalYear: annualFact.fy ?? Number.parseInt(annualFact.end.slice(0, 4), 10),
        fiscalQuarter: 'Q4' as const,
        periodStart: dayAfter(nineMonthFact.end),
        periodEnd: annualFact.end,
        revenueUsd: annualFact.val - nineMonthFact.val,
        derivation: 'derived_from_annual_and_nine_months' as const,
      },
    ];
  });
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return undefined;
  return Math.round(((current - previous) / Math.abs(previous)) * 10_000) / 100;
}

function addTrendComparisons(quarters: QuarterlyRevenue[]) {
  return quarters.map((quarter, index) => {
    const previousQuarter = quarters[index - 1];
    const previousYear = quarters.find(
      (candidate) =>
        candidate.fiscalYear === quarter.fiscalYear - 1 &&
        candidate.fiscalQuarter === quarter.fiscalQuarter,
    );
    const daysSincePrevious = previousQuarter
      ? (Date.parse(quarter.periodEnd) - Date.parse(previousQuarter.periodEnd)) / DAY_MS
      : undefined;

    return {
      ...quarter,
      changeFromPreviousQuarterPct:
        previousQuarter && daysSincePrevious && daysSincePrevious >= 60 && daysSincePrevious <= 140
          ? percentChange(quarter.revenueUsd, previousQuarter.revenueUsd)
          : undefined,
      changeYearOverYearPct: previousYear
        ? percentChange(quarter.revenueUsd, previousYear.revenueUsd)
        : undefined,
    };
  });
}

export function selectQuarterlyRevenue(
  response: CompanyFactsResponse,
  periods = 8,
): QuarterlyRevenue[] {
  const facts = revenueFacts(response);
  const quartersByPeriodEnd = new Map<string, QuarterlyRevenue>();

  for (const quarter of [...reportedQuarters(facts), ...derivedFourthQuarters(facts)]) {
    quartersByPeriodEnd.set(quarter.periodEnd, quarter);
  }

  const chronologicalQuarters = [...quartersByPeriodEnd.values()].sort((left, right) =>
    left.periodEnd.localeCompare(right.periodEnd),
  );

  if (!chronologicalQuarters.length) {
    throw new Error('SEC EDGAR did not provide usable quarterly revenue for this ticker.');
  }

  return addTrendComparisons(chronologicalQuarters).slice(-periods);
}
