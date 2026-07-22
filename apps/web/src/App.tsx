import type { FormEvent } from 'react';
import { useState } from 'react';

import { AppShell } from './components/layout/AppShell';
import { CommitteePanel } from './components/research/CommitteePanel';
import { EmptyResearchState } from './components/research/EmptyResearchState';
import { EvidencePanel } from './components/research/EvidencePanel';
import { ResearchMemo } from './components/research/ResearchMemo';
import { ResearchProgress } from './components/research/ResearchProgress';
import { TickerSearch } from './components/research/TickerSearch';
import { useResearch } from './hooks/use-research';

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const { activePhase, error, isLoading, result, submitResearch } = useResearch();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitResearch(ticker.trim());
  }

  return (
    <AppShell>
      <section className="workspace-intro">
        <div>
          <span className="section-kicker">AI-assisted equity research</span>
          <h1>
            Make the case.
            <br />
            <em>Then challenge it.</em>
          </h1>
          <p className="workspace-lede">
            A transparent research workspace that turns public filings into a clear, source-backed
            starting point.
          </p>
        </div>
        <div className="intro-meta">
          <span className="meta-value">01</span>
          <span className="meta-label">
            Research
            <br />
            workspace
          </span>
        </div>
      </section>

      <TickerSearch
        isLoading={isLoading}
        ticker={ticker}
        onChange={setTicker}
        onSubmit={handleSubmit}
      />
      {error ? (
        <div className="request-error" role="alert">
          <strong>Research could not run</strong>
          {error}
        </div>
      ) : null}

      <ResearchProgress
        activePhase={activePhase}
        isLoading={isLoading}
        hasResult={Boolean(result?.memo)}
      />

      {result?.memo ? (
        <section className="results-layout">
          <ResearchMemo result={result} />
          <EvidencePanel sources={result.sources} />
          <CommitteePanel reports={result.analystReports} />
        </section>
      ) : (
        <EmptyResearchState />
      )}
    </AppShell>
  );
}
