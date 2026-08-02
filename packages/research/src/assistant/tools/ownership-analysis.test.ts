import { describe, expect, it } from 'vitest';

import type { InsiderTransaction } from '../../tools/massive-form4.js';
import {
  activityTypeForTransactionCode,
  compareInsiderTransactionDetails,
  transactionCodesForActivities,
} from './ownership-analysis.js';

function transaction(code: string, transactionDate: string): InsiderTransaction {
  return {
    roles: [],
    transactionCode: code,
    transactionDate,
    tickers: ['TEST'],
    planStatus: 'not_disclosed',
    ownershipType: 'not_disclosed',
    footnotes: [],
  };
}

describe('insider activity interpretation', () => {
  it('maps model-facing activity types to SEC codes in TypeScript', () => {
    expect(transactionCodesForActivities(['open_market_purchases'])).toEqual(['P']);
    expect(transactionCodesForActivities(['open_market_sales', 'compensation'])).toEqual([
      'S',
      'A',
      'F',
      'I',
      'M',
    ]);
    expect(transactionCodesForActivities(['all'])).toBeUndefined();
  });

  it('classifies SEC codes without relying on alphabetical enum order', () => {
    expect(activityTypeForTransactionCode('P')).toBe('open_market_purchases');
    expect(activityTypeForTransactionCode('S')).toBe('open_market_sales');
    expect(activityTypeForTransactionCode('A')).toBe('compensation');
    expect(activityTypeForTransactionCode('G')).toBe('gifts_and_transfers');
    expect(activityTypeForTransactionCode('K')).toBe('derivatives');
    expect(activityTypeForTransactionCode('V')).toBe('other');
  });

  it('prioritizes directly interpretable open-market activity in bounded details', () => {
    const transactions = [
      transaction('A', '2026-08-01'),
      transaction('S', '2026-07-01'),
      transaction('P', '2026-06-01'),
    ];

    transactions.sort((left, right) =>
      compareInsiderTransactionDetails(left, right, {
        detailStrategy: 'most_relevant',
        sortBy: 'transaction_date',
        sortOrder: 'desc',
      }),
    );

    expect(transactions.map((item) => item.transactionCode)).toEqual(['S', 'P', 'A']);
  });
});
