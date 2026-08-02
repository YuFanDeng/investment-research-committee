import type { MarketBar } from '../schemas.js';
import type { QuarterlyRevenue } from '../tools/sec-quarterly.js';
import type {
  AssistantContentBlock,
  BarChartContentBlock,
  DataTableContentBlock,
  LineChartContentBlock,
  MetricGridContentBlock,
} from './content-blocks.js';

type CompactInsiderTransaction = {
  filingDate?: string;
  insider: {
    name?: string;
    officerTitle?: string;
    roles: string[];
  };
  transaction: {
    date?: string;
    category: string;
    shares?: number;
    pricePerShare?: number;
    disclosedValue?: number;
  };
  executionContext: {
    planStatus: string;
    ownershipType: string;
  };
  sourceId?: string;
};

type InsiderSummary = {
  transactionCount: number;
  distinctInsiderCount: number;
  byCategory: Record<string, { count: number }>;
};

const CHART_COLORS = ['#4f46e5', '#0f9f6e', '#d97706', '#dc5a65', '#7c3aed', '#0284c7'];

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function createPriceHistoryBlock(
  ticker: string,
  bars: MarketBar[],
  sourceId: string,
): LineChartContentBlock {
  return {
    type: 'line-chart',
    id: `price-history-${ticker}`,
    title: `${ticker} price history`,
    description: `${bars.length} adjusted daily closing-price observations`,
    sourceIds: [sourceId],
    xKey: 'date',
    valueFormat: 'currency',
    series: [{ key: 'close', label: 'Close', color: CHART_COLORS[0] }],
    data: bars.map((bar) => ({ date: bar.date, close: bar.close })),
  };
}

export function createQuarterlyRevenueBlock(
  ticker: string,
  quarters: QuarterlyRevenue[],
  sourceId: string,
): BarChartContentBlock {
  return {
    type: 'bar-chart',
    id: `quarterly-revenue-${ticker}`,
    title: `${ticker} quarterly revenue`,
    description: `${quarters.length} fiscal quarters from SEC filings`,
    sourceIds: [sourceId],
    xKey: 'quarter',
    valueFormat: 'currency',
    series: [{ key: 'revenue', label: 'Revenue', color: CHART_COLORS[0] }],
    data: quarters.map((quarter) => ({
      quarter: `${quarter.fiscalYear} ${quarter.fiscalQuarter}`,
      revenue: quarter.revenueUsd,
      periodEnd: quarter.periodEnd,
      derivation: quarter.derivation,
    })),
  };
}

function categoryCount(summary: InsiderSummary, categories: string[]) {
  return categories.reduce(
    (count, category) => count + (summary.byCategory[category]?.count ?? 0),
    0,
  );
}

export function createInsiderTransactionBlocks(
  ticker: string,
  summary: InsiderSummary,
  transactions: CompactInsiderTransaction[],
  sourceIds: string[],
): [MetricGridContentBlock, DataTableContentBlock] {
  const openMarketCount = categoryCount(summary, ['open_market_purchase', 'open_market_sale']);
  const compensationCount = categoryCount(summary, [
    'grant_or_award',
    'option_exercise_or_conversion',
    'tax_or_exercise_cost_withholding',
  ]);

  return [
    {
      type: 'metric-grid',
      id: `insider-summary-${ticker}`,
      title: `${ticker} insider activity`,
      description: 'Summary of all matching transactions in the bounded provider scan',
      sourceIds,
      metrics: [
        { label: 'Transactions', value: summary.transactionCount, format: 'integer' },
        { label: 'Distinct insiders', value: summary.distinctInsiderCount, format: 'integer' },
        { label: 'Open-market trades', value: openMarketCount, format: 'integer' },
        { label: 'Compensation-related', value: compensationCount, format: 'integer' },
      ],
    },
    {
      type: 'data-table',
      id: `insider-transactions-${ticker}`,
      title: 'Transaction details',
      description:
        transactions.length < summary.transactionCount
          ? `${transactions.length} representative details from ${summary.transactionCount} matching transactions`
          : `${transactions.length} matching transactions`,
      sourceIds,
      initiallyVisibleRows: 3,
      columns: [
        { key: 'date', label: 'Date', format: 'date' },
        { key: 'insider', label: 'Insider', format: 'text' },
        { key: 'activity', label: 'Activity', format: 'badge' },
        { key: 'shares', label: 'Shares', format: 'number' },
        { key: 'price', label: 'Price', format: 'currency' },
        { key: 'value', label: 'Value', format: 'currency' },
        { key: 'ownership', label: 'Ownership', format: 'badge' },
        { key: 'plan', label: '10b5-1', format: 'badge' },
        { key: 'sourceId', label: 'Source', format: 'source' },
      ],
      rows: transactions.map((transaction) => ({
        date: transaction.transaction.date ?? transaction.filingDate ?? 'Not disclosed',
        insider: transaction.insider.name ?? 'Not disclosed',
        activity: transaction.transaction.category,
        shares: transaction.transaction.shares ?? null,
        price: transaction.transaction.pricePerShare ?? null,
        value: transaction.transaction.disclosedValue ?? null,
        ownership: transaction.executionContext.ownershipType,
        plan: transaction.executionContext.planStatus,
        sourceId: transaction.sourceId ?? null,
      })),
    },
  ];
}

export function mergeContentBlock(
  existing: AssistantContentBlock | undefined,
  incoming: AssistantContentBlock,
) {
  if (!existing || existing.type !== 'line-chart' || incoming.type !== 'line-chart') {
    return incoming;
  }

  // Keep the richer chart metadata when price history and moving averages arrive in either order.
  const preferredBlock = incoming.series.length >= existing.series.length ? incoming : existing;
  const dataByX = new Map<string, Record<string, string | number | boolean | null>>();
  for (const datum of [...existing.data, ...incoming.data]) {
    const x = datum[preferredBlock.xKey];
    if (typeof x !== 'string') continue;
    dataByX.set(x, { ...(dataByX.get(x) ?? {}), ...datum });
  }
  const seriesByKey = new Map(
    [...existing.series, ...incoming.series].map((series) => [series.key, series]),
  );

  return {
    ...preferredBlock,
    sourceIds: [...new Set([...existing.sourceIds, ...incoming.sourceIds])],
    series: [...seriesByKey.values()],
    data: [...dataByX.values()].sort((left, right) =>
      String(left[preferredBlock.xKey]).localeCompare(String(right[preferredBlock.xKey])),
    ),
  };
}
