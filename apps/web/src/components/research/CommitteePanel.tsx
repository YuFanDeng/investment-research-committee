import type { AnalystReport, AnalystRole } from '../../types/research';

type CommitteePanelProps = {
  reports: AnalystReport[];
};

const ROLE_LABELS: Record<AnalystRole, string> = {
  fundamentals: 'Fundamentals',
  business_quality: 'Business quality',
  valuation: 'Valuation',
};

function formatConfidence(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`;
}

export function CommitteePanel({ reports }: CommitteePanelProps) {
  if (!reports.length) return null;

  return (
    <section className="committee-panel" aria-labelledby="committee-heading">
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">Independent views</span>
          <h2 id="committee-heading">Committee desk</h2>
        </div>
        <span className="source-count">{reports.length}</span>
      </div>
      <p className="panel-description">
        Three focused analysts review the same evidence before the chair writes the memo.
      </p>
      <div className="committee-list">
        {reports.map((report) => (
          <article className="analyst-report" key={report.role}>
            <div className="analyst-report-header">
              <strong>{ROLE_LABELS[report.role]}</strong>
              <span>{formatConfidence(report.confidence)}</span>
            </div>
            <p>{report.thesis}</p>
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
          </article>
        ))}
      </div>
    </section>
  );
}
