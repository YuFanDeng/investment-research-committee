import type { Form4TransactionCode, InsiderTransaction } from '../../tools/massive-form4.js';

export type OwnershipFilters = {
  transactionCodes?: Form4TransactionCode[];
  ownershipType: 'all' | 'direct' | 'indirect' | 'not_disclosed';
  planStatus: 'all' | InsiderTransaction['planStatus'];
  securityType: 'all' | 'derivative' | 'non-derivative';
  insiderRoles?: InsiderTransaction['roles'];
};

export type OwnershipSort = {
  sortBy: 'filing_date' | 'transaction_date' | 'transaction_value';
  sortOrder: 'asc' | 'desc';
};

export function transactionCategory(code?: string) {
  const categories: Record<string, string> = {
    P: 'open_market_purchase',
    S: 'open_market_sale',
    A: 'grant_or_award',
    M: 'option_exercise_or_conversion',
    F: 'tax_or_exercise_cost_withholding',
    G: 'gift',
  };
  return (code && categories[code]) ?? 'other';
}

export function matchesOwnershipFilters(
  transaction: InsiderTransaction,
  filters: OwnershipFilters,
) {
  if (
    filters.transactionCodes?.length &&
    (!transaction.transactionCode ||
      !filters.transactionCodes.includes(transaction.transactionCode as Form4TransactionCode))
  ) {
    return false;
  }
  if (filters.ownershipType !== 'all' && transaction.ownershipType !== filters.ownershipType) {
    return false;
  }
  if (filters.planStatus !== 'all' && transaction.planStatus !== filters.planStatus) return false;
  if (filters.securityType !== 'all' && transaction.securityType !== filters.securityType) {
    return false;
  }
  if (
    filters.insiderRoles?.length &&
    !filters.insiderRoles.some((role) => transaction.roles.includes(role))
  ) {
    return false;
  }
  return transaction.recordType === undefined || transaction.recordType === 'transaction';
}

export function compareInsiderTransactions(
  left: InsiderTransaction,
  right: InsiderTransaction,
  sort: OwnershipSort,
) {
  const leftValue =
    sort.sortBy === 'transaction_value'
      ? (left.value ?? Number.NEGATIVE_INFINITY)
      : ((sort.sortBy === 'filing_date' ? left.filingDate : left.transactionDate) ?? '');
  const rightValue =
    sort.sortBy === 'transaction_value'
      ? (right.value ?? Number.NEGATIVE_INFINITY)
      : ((sort.sortBy === 'filing_date' ? right.filingDate : right.transactionDate) ?? '');
  const comparison = leftValue < rightValue ? -1 : leftValue > rightValue ? 1 : 0;
  return sort.sortOrder === 'asc' ? comparison : -comparison;
}

export function summarizeInsiderTransactions(transactions: InsiderTransaction[]) {
  const byCategory: Record<
    string,
    { count: number; disclosedValue: number; valuedTransactionCount: number }
  > = {};
  const distinctInsiders = new Set<string>();

  for (const transaction of transactions) {
    const category = transactionCategory(transaction.transactionCode);
    const summary = byCategory[category] ?? {
      count: 0,
      disclosedValue: 0,
      valuedTransactionCount: 0,
    };
    summary.count += 1;
    summary.disclosedValue += transaction.value ?? 0;
    if (transaction.value !== undefined) summary.valuedTransactionCount += 1;
    byCategory[category] = summary;
    if (transaction.ownerCik || transaction.ownerName) {
      distinctInsiders.add(transaction.ownerCik ?? transaction.ownerName!);
    }
  }

  const countBy = <T extends string>(selector: (transaction: InsiderTransaction) => T) =>
    transactions.reduce<Record<T, number>>(
      (counts, transaction) => {
        const key = selector(transaction);
        counts[key] = (counts[key] ?? 0) + 1;
        return counts;
      },
      {} as Record<T, number>,
    );

  return {
    transactionCount: transactions.length,
    distinctInsiderCount: distinctInsiders.size,
    byCategory,
    byPlanStatus: countBy((transaction) => transaction.planStatus),
    byOwnershipType: countBy((transaction) => transaction.ownershipType),
  };
}

export function compactInsiderTransaction(
  transaction: InsiderTransaction,
  availableSourceIds: Set<string>,
) {
  const candidateSourceId = transaction.accessionNumber
    ? `sec-form4-${transaction.accessionNumber}`
    : undefined;
  return {
    accessionNumber: transaction.accessionNumber,
    filingDate: transaction.filingDate,
    formType: transaction.formType,
    insider: {
      cik: transaction.ownerCik,
      name: transaction.ownerName,
      officerTitle: transaction.officerTitle,
      roles: transaction.roles,
    },
    transaction: {
      date: transaction.transactionDate,
      deemedExecutionDate: transaction.deemedExecutionDate,
      code: transaction.transactionCode,
      category: transactionCategory(transaction.transactionCode),
      direction: transaction.acquiredOrDisposed,
      shares: transaction.shares,
      pricePerShare: transaction.pricePerShare,
      disclosedValue: transaction.value,
    },
    security: {
      title: transaction.securityTitle,
      type: transaction.securityType,
      sharesOwnedAfter: transaction.sharesOwnedAfter,
      underlyingTitle: transaction.underlyingSecurityTitle,
      underlyingShares: transaction.underlyingShares,
      exerciseDate: transaction.exerciseDate,
      exercisePrice: transaction.exercisePrice,
      expirationDate: transaction.expirationDate,
    },
    executionContext: {
      planStatus: transaction.planStatus,
      ownershipType: transaction.ownershipType,
      natureOfOwnership: transaction.natureOfOwnership,
      filingTimeliness: transaction.filingTimeliness,
      equitySwapInvolved: transaction.equitySwapInvolved,
    },
    footnotes: transaction.footnotes.slice(0, 2).map((footnote) => ({
      id: footnote.id,
      description: footnote.description?.slice(0, 240),
    })),
    remarks: transaction.remarks?.slice(0, 240),
    sourceId:
      candidateSourceId && availableSourceIds.has(candidateSourceId)
        ? candidateSourceId
        : undefined,
  };
}
