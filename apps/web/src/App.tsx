import type { FormEvent } from 'react';
import { useState } from 'react';

import { AppShell } from './components/layout/AppShell';
import { CommitteePanel } from './components/research/CommitteePanel';
import { EmptyResearchState } from './components/research/EmptyResearchState';
import { EvidencePanel } from './components/research/EvidencePanel';
import { ResearchMemo } from './components/research/ResearchMemo';
import { ResearchProgress } from './components/research/ResearchProgress';
import { TickerSearch } from './components/research/TickerSearch';
import { MarketSnapshotPanel } from './components/research/MarketSnapshotPanel';
import { SkepticPanel } from './components/research/SkepticPanel';
import { useResearch } from './hooks/use-research';
import type { SecDataMode } from './types/research';

export default function App() {
  const [ticker, setTicker] = useState('AAPL');
  const isDevelopment = import.meta.env.DEV;
  const [secDataMode, setSecDataMode] = useState<SecDataMode>(isDevelopment ? 'fixture' : 'live');
  const { error, isLoading, result, stageStatuses, statusMessage, submitResearch } = useResearch();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitResearch(ticker.trim(), secDataMode);
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
        isDevelopment={isDevelopment}
        secDataMode={secDataMode}
        onSecDataModeChange={setSecDataMode}
      />
      {error ? (
        <div className="request-error" role="alert">
          <strong>Research could not run</strong>
          {error}
        </div>
      ) : null}

      <ResearchProgress
        isLoading={isLoading}
        hasResult={Boolean(result?.memo)}
        stageStatuses={stageStatuses}
        statusMessage={statusMessage}
      />

      {result?.memo ? (
        <section className="results-layout">
          <MarketSnapshotPanel snapshot={result.marketSnapshot} />
          <ResearchMemo result={result} />
          <CommitteePanel reports={result.analystReports} />
          <SkepticPanel report={result.challengeReport} />
          <EvidencePanel sources={result.sources} />
        </section>
      ) : (
        <EmptyResearchState />
      )}
    </AppShell>
  );
}
