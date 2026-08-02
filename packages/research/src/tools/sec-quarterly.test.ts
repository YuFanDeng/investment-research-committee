import { describe, expect, it } from 'vitest';

import type { CompanyFactsResponse, SecFact } from './sec-edgar.js';
import { selectQuarterlyRevenue } from './sec-quarterly.js';

function revenueFact(fact: SecFact): SecFact {
  return {
    accn: `test-${fact.end}-${fact.fp}-${fact.start}`,
    form: fact.fp === 'FY' ? '10-K' : '10-Q',
    ...fact,
  };
}

function quarterlyRevenueFixture(): CompanyFactsResponse {
  const facts: SecFact[] = [
    revenueFact({
      start: '2024-01-01',
      end: '2024-03-31',
      filed: '2024-05-01',
      fp: 'Q1',
      fy: 2024,
      val: 100,
    }),
    revenueFact({
      start: '2024-01-01',
      end: '2024-03-31',
      filed: '2025-05-01',
      fp: 'Q1',
      fy: 2025,
      val: 999,
    }),
    revenueFact({
      start: '2024-04-01',
      end: '2024-06-30',
      filed: '2024-08-01',
      fp: 'Q2',
      fy: 2024,
      val: 110,
    }),
    revenueFact({
      start: '2024-01-01',
      end: '2024-06-30',
      filed: '2024-08-01',
      fp: 'Q2',
      fy: 2024,
      val: 210,
    }),
    revenueFact({
      start: '2024-07-01',
      end: '2024-09-30',
      filed: '2024-11-01',
      fp: 'Q3',
      fy: 2024,
      val: 120,
    }),
    revenueFact({
      start: '2024-01-01',
      end: '2024-09-30',
      filed: '2024-11-01',
      fp: 'Q3',
      fy: 2024,
      val: 330,
    }),
    revenueFact({
      start: '2024-01-01',
      end: '2024-12-31',
      filed: '2025-02-01',
      fp: 'FY',
      fy: 2024,
      val: 460,
    }),
    revenueFact({
      start: '2025-01-01',
      end: '2025-03-31',
      filed: '2025-05-01',
      fp: 'Q1',
      fy: 2025,
      val: 140,
    }),
    revenueFact({
      start: '2025-04-01',
      end: '2025-06-30',
      filed: '2025-08-01',
      fp: 'Q2',
      fy: 2025,
      val: 150,
    }),
    revenueFact({
      start: '2025-07-01',
      end: '2025-09-30',
      filed: '2025-11-01',
      fp: 'Q3',
      fy: 2025,
      val: 160,
    }),
    revenueFact({
      start: '2025-01-01',
      end: '2025-09-30',
      filed: '2025-11-01',
      fp: 'Q3',
      fy: 2025,
      val: 450,
    }),
    revenueFact({
      start: '2025-01-01',
      end: '2025-12-31',
      filed: '2026-02-01',
      fp: 'FY',
      fy: 2025,
      val: 620,
    }),
  ];

  return {
    facts: {
      'us-gaap': {
        RevenueFromContractWithCustomerExcludingAssessedTax: { units: { USD: facts } },
      },
    },
  };
}

describe('selectQuarterlyRevenue', () => {
  it('separates reported quarters from cumulative facts and derives fourth quarters', () => {
    const quarters = selectQuarterlyRevenue(quarterlyRevenueFixture(), 8);

    expect(quarters).toHaveLength(8);
    expect(quarters.map((quarter) => quarter.revenueUsd)).toEqual([
      100, 110, 120, 130, 140, 150, 160, 170,
    ]);
    expect(quarters[3]).toMatchObject({
      fiscalYear: 2024,
      fiscalQuarter: 'Q4',
      periodStart: '2024-10-01',
      derivation: 'derived_from_annual_and_nine_months',
    });
  });

  it('calculates comparisons from normalized quarters before limiting the result', () => {
    const quarters = selectQuarterlyRevenue(quarterlyRevenueFixture(), 4);

    expect(quarters[0]).toMatchObject({
      fiscalYear: 2025,
      fiscalQuarter: 'Q1',
      changeFromPreviousQuarterPct: 7.69,
      changeYearOverYearPct: 40,
    });
    expect(quarters[3]).toMatchObject({
      fiscalQuarter: 'Q4',
      changeYearOverYearPct: 30.77,
    });
  });
});
