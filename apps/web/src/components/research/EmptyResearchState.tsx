export function EmptyResearchState() {
  return (
    <section className="empty-research-state">
      <div className="empty-orbit" aria-hidden="true">
        <span>IR</span>
      </div>
      <span className="section-kicker">Ready when you are</span>
      <h2>Start with a company.</h2>
      <p>Enter a ticker to see the research workflow turn public filings into an auditable memo.</p>
      <div className="example-tickers">
        <span>AAPL</span>
        <span>MSFT</span>
        <span>NVDA</span>
        <span>TSLA</span>
      </div>
    </section>
  );
}
