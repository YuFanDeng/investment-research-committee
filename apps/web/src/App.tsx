import { FormEvent, useState } from 'react';

type Source = {
  id: string;
  title: string;
  url: string;
  sourceType: 'sec_filing' | 'market_data';
  retrievedAt: string;
};

type Memo = {
  companySnapshot: string;
  financialHighlights: string[];
  whatStandsOut: string[];
  risksAndLimitations: string[];
  sourceIdsUsed: string[];
  disclaimer: string;
};

type ResearchResponse = {
  ticker: string;
  status: 'pending' | 'researching' | 'complete' | 'failed';
  memo?: Memo;
  sources: Source[];
  errors: string[];
};

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const [result, setResult] = useState<ResearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  async function runResearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError(undefined);

    try {
      const response = await fetch(`${API_URL}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message ?? 'Research could not be started.');
      }

      setResult(await response.json());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main>
      <section className="hero">
        <p className="eyebrow">LangGraph-powered equity research</p>
        <h1>Investment Research Committee</h1>
        <p className="lede">
          Turn a ticker into a source-backed fundamentals memo using SEC EDGAR data.
        </p>
        <form onSubmit={runResearch} className="search-form">
          <label htmlFor="ticker">U.S. ticker</label>
          <div className="search-row">
            <input
              id="ticker"
              value={ticker}
              onChange={(event) => setTicker(event.target.value.toUpperCase())}
              placeholder="AAPL"
              maxLength={10}
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Researching…' : 'Run research'}
            </button>
          </div>
        </form>
        {error ? (
          <p className="error" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section className="workflow" aria-label="Research workflow">
        <span>1. Validate ticker</span>
        <span>2. Retrieve evidence</span>
        <span>3. Write memo</span>
        <span>4. Verify sources</span>
      </section>

      {result?.memo ? <MemoView result={result} /> : <EmptyState />}
    </main>
  );
}

function EmptyState() {
  return (
    <section className="empty-state">
      <p>
        Start with a ticker such as <strong>AAPL</strong>.
      </p>
      <span>Your memo and evidence trail will appear here.</span>
    </section>
  );
}

function MemoView({ result }: { result: ResearchResponse }) {
  const { memo } = result;
  if (!memo) return null;

  return (
    <section className="memo-grid">
      <article className="memo-card main-card">
        <div className="card-heading">
          <p className="eyebrow">Research memo</p>
          <span className="status">{result.status}</span>
        </div>
        <h2>{result.ticker}</h2>
        {result.errors.length ? <p className="warning">{result.errors.join(' ')}</p> : null}
        <p>{memo.companySnapshot}</p>
        <h3>Financial highlights</h3>
        <ul>
          {memo.financialHighlights.map((highlight) => (
            <li key={highlight}>{highlight}</li>
          ))}
        </ul>
        <h3>What stands out</h3>
        <ul>
          {memo.whatStandsOut.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <h3>Risks and limitations</h3>
        <ul>
          {memo.risksAndLimitations.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ul>
        <p className="disclaimer">{memo.disclaimer}</p>
      </article>
      <aside className="memo-card source-card">
        <p className="eyebrow">Evidence</p>
        <h2>Sources</h2>
        {result.sources.map((source) => (
          <a className="source" key={source.id} href={source.url} target="_blank" rel="noreferrer">
            <span>{source.sourceType.replace('_', ' ')}</span>
            <strong>{source.title}</strong>
            <small>Retrieved {new Date(source.retrievedAt).toLocaleString()}</small>
          </a>
        ))}
      </aside>
    </section>
  );
}
