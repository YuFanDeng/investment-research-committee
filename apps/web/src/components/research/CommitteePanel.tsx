import type { AnalystReport, AnalystRole } from '../../types/research';
import type { ResearchStageStatus } from '../../hooks/use-research';

type CommitteePanelProps = {
  reports: AnalystReport[];
  isLoading: boolean;
  stageStatuses: Record<string, ResearchStageStatus>;
};

const ROLE_LABELS: Record<AnalystRole, string> = {
  fundamentals: 'Fundamentals',
  business_quality: 'Business quality',
  valuation: 'Valuation',
};

const ANALYST_STAGES: Record<AnalystRole, string> = {
  fundamentals: 'fundamentalsAnalyst',
  business_quality: 'businessQualityAnalyst',
  valuation: 'valuationAnalyst',
};

const ROLE_ORDER: AnalystRole[] = ['fundamentals', 'business_quality', 'valuation'];

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}

export function CommitteePanel({ reports, isLoading, stageStatuses }: CommitteePanelProps) {
  if (!reports.length && !isLoading) return null;

  return (
    <section className="committee-panel" aria-labelledby="committee-heading">
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">Independent views</span>
          <h2 id="committee-heading">Committee desk</h2>
        </div>
        <span className="source-count">{reports.length}/3</span>
      </div>
      <p className="panel-description">
        Three focused analysts review the same evidence before the chair writes the memo.
      </p>
      <div className="committee-list">
        {ROLE_ORDER.map((role) => {
          const report = reports.find((candidate) => candidate.role === role);
          const status = stageStatuses[ANALYST_STAGES[role]] ?? 'waiting';

          if (!report) {
            return (
              <article className="analyst-report analyst-pending" key={role}>
                <div className="analyst-report-header">
                  <strong>{ROLE_LABELS[role]}</strong>
                  <span className={`artifact-status is-${status}`}>{status}</span>
                </div>
                <div className="artifact-placeholder">
                  <span className="skeleton-line skeleton-line-wide" />
                  <span className="skeleton-line" />
                  <p>
                    {status === 'active'
                      ? `${ROLE_LABELS[role]} analyst is reviewing the evidence…`
                      : 'Waiting for shared evidence.'}
                  </p>
                </div>
              </article>
            );
          }

          return (
            <article className="analyst-report artifact-enter" key={report.role}>
              <div className="analyst-report-header">
                <strong>{ROLE_LABELS[report.role]}</strong>
                <span>{formatConfidence(report.confidence)}</span>
              </div>
              <p>{report.thesis}</p>
              <details className="analyst-details">
                <summary>Review evidence and concerns</summary>
                <div className="analyst-columns">
                  <div>
                    <span className="analyst-label">Evidence</span>
                    <ul>
                      {report.supportingEvidence.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="analyst-label analyst-label-risk">Concerns</span>
                    <ul>
                      {report.concerns.slice(0, 2).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
