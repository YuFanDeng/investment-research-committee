import type { MarketSnapshot } from '../../types/research';

type MarketSnapshotPanelProps = {
  snapshot?: MarketSnapshot;
};

function formatBillions(value?: number) {
  return typeof value === 'number' ? `$${(value / 1_000_000_000).toFixed(1)}B` : '—';
}

function calculateReturn(snapshot: MarketSnapshot) {
  const first = snapshot.historicalCloses[0]?.close;
  const last = snapshot.historicalCloses.at(-1)?.close;
  if (!first || typeof last !== 'number') return '—';
  return `${(((last - first) / first) * 100).toFixed(1)}%`;
}

export function MarketSnapshotPanel({ snapshot }: MarketSnapshotPanelProps) {
  if (!snapshot) return null;

  return (
    <section className="market-snapshot-panel" aria-labelledby="market-snapshot-heading">
      <div className="evidence-heading">
        <div>
          <span className="section-kicker">Market context</span>
          <h2 id="market-snapshot-heading">Price & peer snapshot</h2>
        </div>
        <span className="source-count">EOD</span>
      </div>
      <p className="panel-description">
        Normalized from Massive and timestamped {new Date(snapshot.retrievedAt).toLocaleString()}.
      </p>
      <div className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Previous close</span>
          <strong>
            {snapshot.currency.toUpperCase()} {snapshot.currentPrice.toFixed(2)}
          </strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">1-year return</span>
          <strong>{calculateReturn(snapshot)}</strong>
        </div>
        <div className="metric-card">
          <span className="metric-label">Market cap</span>
          <strong>{formatBillions(snapshot.marketCap)}</strong>
        </div>
      </div>
      {snapshot.peers.length ? (
        <div className="peer-list">
          <span className="analyst-label">Related companies</span>
          <div className="peer-grid">
            {snapshot.peers.map((peer) => (
              <div className="peer-item" key={peer.ticker}>
                <strong>{peer.ticker}</strong>
                <span>{peer.name ?? 'Related company'}</span>
                <small>{formatBillions(peer.marketCap)} market cap</small>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
