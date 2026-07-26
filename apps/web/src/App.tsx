import type { FormEvent } from 'react';
import { useState } from 'react';

import { AppShell } from './components/layout/AppShell';
import { CommitteePanel } from './components/research/CommitteePanel';
import { ApprovalPanel } from './components/research/ApprovalPanel';
import { CompanyHeader } from './components/research/CompanyHeader';
import { EmptyResearchState } from './components/research/EmptyResearchState';
import { EvidencePanel } from './components/research/EvidencePanel';
import { FundamentalsSnapshotPanel } from './components/research/FundamentalsSnapshotPanel';
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
  const {
    approvalRequest,
    error,
    isDraftReady,
    isLoading,
    result,
    reviewResearch,
    stageStatuses,
    statusMessage,
    submitResearch,
  } = useResearch();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitResearch(ticker.trim(), secDataMode);
  }

  return (
    <AppShell>
      {result ? (
        <>
          <CompanyHeader isLoading={isLoading} result={result} />
          <nav className="workspace-nav" aria-label="Research sections">
            <a href="#market-snapshot-heading">Market</a>
            <a href="#fundamentals-heading">Fundamentals</a>
            <a href="#committee-heading">Committee</a>
            <a href="#memo-heading">Memo</a>
            <a href="#sources-heading">Sources</a>
          </nav>
          <div className="research-toolbar">
            <TickerSearch
              compact
              isLoading={isLoading}
              ticker={ticker}
              onChange={setTicker}
              onSubmit={handleSubmit}
              isDevelopment={isDevelopment}
              secDataMode={secDataMode}
              onSecDataModeChange={setSecDataMode}
            />
          </div>
          {error ? (
            <div className="request-error" role="alert">
              <strong>Research could not run</strong>
              {error}
            </div>
          ) : null}
          <div className="research-workspace">
            <ResearchProgress
              isLoading={isLoading}
              hasResult={Boolean(result.memo)}
              isAwaitingApproval={Boolean(approvalRequest)}
              isRejected={result.status === 'rejected'}
              stageStatuses={stageStatuses}
              statusMessage={statusMessage}
            />
            <section className="results-layout">
              <MarketSnapshotPanel
                snapshot={result.marketSnapshot}
                status={stageStatuses.fetchMarketData ?? 'waiting'}
              />
              <FundamentalsSnapshotPanel
                companyName={result.companyName}
                fundamentals={result.fundamentals}
                status={stageStatuses.fetchSecFundamentals ?? 'waiting'}
              />
              <CommitteePanel
                reports={result.analystReports}
                isLoading={isLoading}
                stageStatuses={stageStatuses}
              />
              <SkepticPanel
                report={result.challengeReport}
                isLoading={isLoading}
                status={stageStatuses.skepticChallenge ?? 'waiting'}
              />
              {approvalRequest ? (
                <ApprovalPanel
                  request={approvalRequest.request}
                  isSubmitting={isLoading}
                  onDecision={(decision) => void reviewResearch(decision)}
                />
              ) : null}
              <ResearchMemo result={result} isDraftReady={isDraftReady} isLoading={isLoading} />
              <EvidencePanel sources={result.sources} isLoading={isLoading} />
            </section>
          </div>
        </>
      ) : (
        <>
          <section className="workspace-intro">
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
          <EmptyResearchState />
        </>
      )}
    </AppShell>
  );
}
