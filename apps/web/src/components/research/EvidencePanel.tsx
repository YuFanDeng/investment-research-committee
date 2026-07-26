import type { Source } from '../../types/research';

type EvidencePanelProps = {
  sources: Source[];
  isLoading: boolean;
};

export function EvidencePanel({ sources, isLoading }: EvidencePanelProps) {
  return (
    <aside className="memo-card evidence-panel">
      <div className="section-kicker">Evidence trail</div>
      <div className="evidence-heading">
        <h2 id="sources-heading">Sources</h2>
        <span className="source-count">{sources.length}</span>
      </div>
      <p className="panel-description">Every memo is grounded in a retrievable source.</p>
      <div className="source-list">
        {sources.length ? (
          sources.map((source) => (
            <a
              className="source-item"
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              <div className="source-item-topline">
                <span className="source-type">{source.sourceType.replace('_', ' ')}</span>
                <span aria-hidden="true">↗</span>
              </div>
              <strong>{source.title}</strong>
              <small>Retrieved {new Date(source.retrievedAt).toLocaleString()}</small>
            </a>
          ))
        ) : (
          <p className="empty-panel">
            {isLoading ? 'Waiting for provider responses…' : 'No sources were returned.'}
          </p>
        )}
      </div>
      <div className="evidence-footer">
        <span className="shield-icon">✓</span>
        <span>Source URLs and timestamps are retained in graph state.</span>
      </div>
    </aside>
  );
}
