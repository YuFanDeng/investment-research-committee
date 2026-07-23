import type { ChallengeReport } from '../../types/research';

type SkepticPanelProps = {
  report?: ChallengeReport;
};

export function SkepticPanel({ report }: SkepticPanelProps) {
  if (!report) return null;

  const sections = [
    ['Thesis weaknesses', report.thesisWeaknesses],
    ['Missing evidence', report.missingEvidence],
    ['Key risks', report.keyRisks],
    ['Required revisions', report.requiredRevisions],
  ] as const;

  return (
    <section className="skeptic-panel" aria-labelledby="skeptic-heading">
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">Quality gate</span>
          <h2 id="skeptic-heading">Skeptic challenge</h2>
        </div>
        <span className="source-count">{Math.round(report.confidence * 100)}%</span>
      </div>
      <p className="panel-description">
        An independent review designed to surface weak claims before the final memo is accepted.
      </p>
      <div className="skeptic-grid">
        {sections.map(([title, items]) => (
          <div className="skeptic-section" key={title}>
            <span className="analyst-label analyst-label-risk">{title}</span>
            <ul>
              {items.slice(0, 3).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
