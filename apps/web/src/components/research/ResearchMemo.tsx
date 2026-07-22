import type { ReactNode } from 'react';
import type {
  Fundamentals,
  ResearchMemo as ResearchMemoData,
  ResearchResponse,
} from '../../types/research';
import { MetricCard } from './MetricCard';

type ResearchMemoProps = {
  result: ResearchResponse;
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

export function ResearchMemo({ result }: ResearchMemoProps) {
  const memo: ResearchMemoData | undefined = result.memo;
  if (!memo) return null;

  return (
    <article className="memo-card research-memo-card">
      <div className="memo-card-header">
        <div>
          <span className="section-kicker">Research memo</span>
          <h2>{result.companyName ?? result.ticker}</h2>
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
