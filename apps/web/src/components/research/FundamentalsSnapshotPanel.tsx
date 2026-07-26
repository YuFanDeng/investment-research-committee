import { Database, Landmark } from 'lucide-react';

import type { Fundamentals } from '../../types/research';
import type { ResearchStageStatus } from '../../hooks/use-research';
import { MetricCard } from './MetricCard';

type FundamentalsSnapshotPanelProps = {
  companyName?: string;
  fundamentals?: Fundamentals;
  status: ResearchStageStatus;
};

function formatBillions(value: number) {
  return `$${(value / 1_000_000_000).toFixed(1)}B`;
}

export function FundamentalsSnapshotPanel({
  companyName,
  fundamentals,
  status,
}: FundamentalsSnapshotPanelProps) {
  return (
    <section
      className={`fundamentals-panel ${fundamentals ? 'artifact-enter' : ''}`}
      aria-labelledby="fundamentals-heading"
    >
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">
            <Database size={13} /> Filing evidence
          </span>
          <h2 id="fundamentals-heading">{companyName ?? 'SEC fundamentals'}</h2>
        </div>
        <span className={`artifact-status is-${status}`}>
          <Landmark size={12} /> {status}
        </span>
      </div>
      {fundamentals ? (
        <>
          <p className="panel-description">
            Annual facts normalized from SEC Company Facts for FY{fundamentals.fiscalYear}.
          </p>
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
        </>
      ) : (
        <div className="artifact-placeholder" role="status">
          <span className="skeleton-line skeleton-line-wide" />
          <span className="skeleton-line" />
          <p>
            {status === 'active'
              ? 'Retrieving SEC Company Facts…'
              : status === 'complete'
                ? 'SEC fundamentals were unavailable.'
                : 'Waiting for ticker validation.'}
          </p>
        </div>
      )}
    </section>
  );
}
