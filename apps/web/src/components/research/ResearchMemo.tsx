import type { ReactNode } from 'react';
import type {
  Fundamentals,
  ResearchMemo as ResearchMemoData,
  ResearchResponse,
} from '../../types/research';
import { MetricCard } from './MetricCard';

type ResearchMemoProps = {
  result: ResearchResponse;
  isDraftReady: boolean;
  isLoading: boolean;
};

function formatBillions(value: number) {
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

function MemoList({ items }: { items: string[] }) {
  return (
    <ul className="memo-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function FinancialMetrics({ fundamentals }: { fundamentals: Fundamentals }) {
  return (
    <div className="metric-grid">
      <MetricCard
        label="Revenue"
        value={formatBillions(fundamentals.revenueUsd)}
        detail={`FY${fundamentals.fiscalYear}`}
      />
      <MetricCard
        label="Net income"
        value={formatBillions(fundamentals.netIncomeUsd)}
        detail={`FY${fundamentals.fiscalYear}`}
      />
      <MetricCard
        label="Operating cash flow"
        value={formatBillions(fundamentals.operatingCashFlowUsd)}
        detail={`FY${fundamentals.fiscalYear}`}
      />
    </div>
  );
}

function MemoSection({
  title,
  children,
  tone = 'default',
}: {
  title: string;
  children: ReactNode;
  tone?: 'default' | 'risk';
}) {
  return (
    <section className={`memo-section ${tone === 'risk' ? 'memo-section-risk' : ''}`}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

export function ResearchMemo({ result, isDraftReady, isLoading }: ResearchMemoProps) {
  const memo: ResearchMemoData | undefined = result.memo;
  if (!memo) {
    if (result.status === 'rejected') {
      return (
        <article className="memo-card research-memo-card rejected-memo-card">
          <div className="memo-card-header">
            <div>
              <span className="section-kicker">Research memo</span>
              <h2 id="memo-heading">Not published</h2>
            </div>
            <span className="artifact-status is-rejected">Rejected</span>
          </div>
          <p className="memo-snapshot">
            Human review ended this run after the skeptic challenge. No final committee memo was
            published.
          </p>
        </article>
      );
    }
    if (!isLoading) return null;

    return (
      <article className="memo-card research-memo-card pending-result-card">
        <div className="memo-card-header">
          <div>
            <span className="section-kicker">Research memo</span>
            <h2 id="memo-heading">{result.companyName ?? result.ticker}</h2>
          </div>
          <span className="artifact-status is-active">
            {isDraftReady ? 'Under review' : 'Preparing'}
          </span>
        </div>
        <div className="artifact-placeholder" role="status">
          <span className="skeleton-line skeleton-line-wide" />
          <span className="skeleton-line" />
          <span className="skeleton-line skeleton-line-short" />
          <p>
            {isDraftReady
              ? 'The chair draft is complete and remains hidden until review is resolved.'
              : 'The final memo will appear after the analysts, chair, and skeptic finish.'}
          </p>
        </div>
      </article>
    );
  }

  return (
    <article className="memo-card research-memo-card">
      <div className="memo-card-header">
        <div>
          <span className="section-kicker">Research memo</span>
          <h2 id="memo-heading">{result.companyName ?? result.ticker}</h2>
          <p className="ticker-subtitle">${result.ticker} · fundamentals snapshot</p>
        </div>
        <span className="complete-badge">
          <span className="status-dot" /> Complete
        </span>
      </div>

      {result.errors.length ? (
        <div className="fallback-alert">
          <strong>Fallback memo</strong>
          {result.errors.join(' ')}
        </div>
      ) : null}
      <p className="memo-snapshot">{memo.companySnapshot}</p>
      {result.fundamentals ? <FinancialMetrics fundamentals={result.fundamentals} /> : null}

      <div className="memo-sections">
        <MemoSection title="Financial highlights">
          <MemoList items={memo.financialHighlights} />
        </MemoSection>
        <MemoSection title="What stands out">
          <MemoList items={memo.whatStandsOut} />
        </MemoSection>
        <MemoSection title="Risks & limitations" tone="risk">
          <MemoList items={memo.risksAndLimitations} />
        </MemoSection>
      </div>
      <p className="disclaimer">
        <span>ⓘ</span>
        {memo.disclaimer}
      </p>
    </article>
  );
}
