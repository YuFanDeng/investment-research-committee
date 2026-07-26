import { Activity, Building2, TrendingDown, TrendingUp } from 'lucide-react';

import type { MarketSnapshot, ResearchResponse } from '../../types/research';

type CompanyHeaderProps = {
  isLoading: boolean;
  result: ResearchResponse;
};

function formatMarketCap(value?: number) {
  if (typeof value !== 'number') return '—';
  if (value >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

function calculateReturn(snapshot?: MarketSnapshot) {
  const first = snapshot?.historicalCloses[0]?.close;
  const last = snapshot?.historicalCloses.at(-1)?.close;
  if (!first || typeof last !== 'number') return { label: '—', tone: 'neutral' as const };
  const percentage = ((last - first) / first) * 100;
  return {
    label: `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`,
    tone: percentage >= 0 ? ('positive' as const) : ('negative' as const),
  };
}

export function CompanyHeader({ isLoading, result }: CompanyHeaderProps) {
  const snapshot = result.marketSnapshot;
  const periodReturn = calculateReturn(snapshot);
  const ReturnIcon = periodReturn.tone === 'negative' ? TrendingDown : TrendingUp;

  return (
    <section className="company-header" aria-labelledby="company-heading">
      <div className="company-identity">
        <span className="company-symbol">
          <Building2 size={14} /> {result.ticker}
        </span>
        <h1 id="company-heading">{result.companyName ?? 'Researching company…'}</h1>
        <p>Source-backed committee research</p>
      </div>

      <div className="company-metrics" aria-label="Company market summary">
        <div>
          <span>Last close</span>
          <strong>
            {snapshot
              ? `${snapshot.currency.toUpperCase()} ${snapshot.currentPrice.toFixed(2)}`
              : '—'}
          </strong>
        </div>
        <div>
          <span>One-year return</span>
          <strong className={`${periodReturn.tone}-value`}>
            <ReturnIcon size={16} /> {periodReturn.label}
          </strong>
        </div>
        <div>
          <span>Market cap</span>
          <strong>{formatMarketCap(snapshot?.marketCap)}</strong>
        </div>
      </div>

      <span
        className={`run-status ${
          isLoading ? 'is-live' : result.status === 'rejected' ? 'is-rejected' : 'is-complete'
        }`}
      >
        <Activity size={14} />
        {isLoading
          ? 'Research live'
          : result.status === 'rejected'
            ? 'Memo rejected'
            : 'Research complete'}
      </span>
    </section>
  );
}
