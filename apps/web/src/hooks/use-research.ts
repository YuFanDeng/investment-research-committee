import { useState } from 'react';

import { runResearchStream } from '../lib/research-api';
import type {
  AnalystReport,
  ResearchEvent,
  ResearchResponse,
  SecDataMode,
  Source,
} from '../types/research';

const STAGE_LABELS: Record<string, string> = {
  validateTicker: 'Validating ticker with the API…',
  fetchSecFundamentals: 'Waiting for SEC EDGAR evidence…',
  fetchMarketData: 'Waiting for Massive market data…',
  fundamentalsAnalyst: 'Fundamentals analyst is working…',
  businessQualityAnalyst: 'Business quality analyst is working…',
  valuationAnalyst: 'Valuation analyst is working…',
  committeeDraft: 'Chair is drafting the committee memo…',
  skepticChallenge: 'Skeptic is challenging the draft…',
  committeeChair: 'Chair is writing the final memo…',
};

export const RESEARCH_STAGES = [
  { id: 'validateTicker', label: 'Validate ticker', phase: 'Validate' },
  { id: 'fetchSecFundamentals', label: 'SEC evidence', phase: 'Evidence' },
  { id: 'fetchMarketData', label: 'Market data', phase: 'Evidence' },
  { id: 'fundamentalsAnalyst', label: 'Fundamentals', phase: 'Committee' },
  { id: 'businessQualityAnalyst', label: 'Business quality', phase: 'Committee' },
  { id: 'valuationAnalyst', label: 'Valuation', phase: 'Committee' },
  { id: 'committeeDraft', label: 'Chair draft', phase: 'Committee' },
  { id: 'skepticChallenge', label: 'Skeptic review', phase: 'Review' },
  { id: 'committeeChair', label: 'Final synthesis', phase: 'Review' },
] as const;

export type ResearchStageStatus = 'waiting' | 'active' | 'complete';

function initialStageStatuses() {
  return Object.fromEntries(RESEARCH_STAGES.map(({ id }) => [id, 'waiting'])) as Record<
    string,
    ResearchStageStatus
  >;
}

function mergeSources(current: Source[], incoming: Source[]) {
  return [...new Map([...current, ...incoming].map((source) => [source.id, source])).values()];
}

function mergeErrors(current: string[], incoming: string[]) {
  return [...new Set([...current, ...incoming])];
}

function upsertAnalystReport(current: AnalystReport[], incoming: AnalystReport) {
  return [...current.filter((report) => report.role !== incoming.role), incoming];
}

export function useResearch() {
  const [result, setResult] = useState<ResearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to start research.');
  const [stageStatuses, setStageStatuses] = useState(initialStageStatuses);

  function handleEvent(event: ResearchEvent) {
    if (event.type === 'run.started') {
      setStatusMessage('API connected. Starting the research workflow…');
    } else if (event.type === 'stage.started') {
      setStatusMessage(STAGE_LABELS[event.stage] ?? `Working on ${event.stage}…`);
      setStageStatuses((current) => ({ ...current, [event.stage]: 'active' }));
    } else if (event.type === 'stage.completed') {
      setStatusMessage(`${STAGE_LABELS[event.stage] ?? event.stage} complete.`);
      setStageStatuses((current) => ({ ...current, [event.stage]: 'complete' }));
    } else if (event.type === 'sec.completed') {
      setResult((current) =>
        current
          ? {
              ...current,
              companyName: event.companyName ?? current.companyName,
              fundamentals: event.fundamentals ?? current.fundamentals,
              sources: mergeSources(current.sources, event.sources),
              errors: mergeErrors(current.errors, event.errors),
            }
          : current,
      );
    } else if (event.type === 'market.completed') {
      setResult((current) =>
        current
          ? {
              ...current,
              marketSnapshot: event.snapshot ?? current.marketSnapshot,
              sources: mergeSources(current.sources, event.sources),
              errors: mergeErrors(current.errors, event.errors),
            }
          : current,
      );
    } else if (event.type === 'analyst.completed' && event.report) {
      setResult((current) =>
        current
          ? {
              ...current,
              analystReports: upsertAnalystReport(current.analystReports, event.report!),
              errors: mergeErrors(current.errors, event.errors),
            }
          : current,
      );
    } else if (event.type === 'draft.completed') {
      setIsDraftReady(true);
      setResult((current) =>
        current ? { ...current, errors: mergeErrors(current.errors, event.errors) } : current,
      );
    } else if (event.type === 'challenge.completed') {
      setResult((current) =>
        current
          ? {
              ...current,
              challengeReport: event.report ?? current.challengeReport,
              errors: mergeErrors(current.errors, event.errors),
            }
          : current,
      );
    } else if (event.type === 'run.completed') {
      setStatusMessage('Research complete.');
      setResult(event.result);
    } else if (event.type === 'run.failed') {
      setStatusMessage('Research stream failed.');
    }
  }

  async function submitResearch(ticker: string, secDataMode: SecDataMode) {
    setIsLoading(true);
    setError(undefined);
    setIsDraftReady(false);
    setResult({
      ticker,
      secDataMode,
      status: 'researching',
      analystReports: [],
      sources: [],
      errors: [],
    });
    setStageStatuses(initialStageStatuses());
    setStatusMessage('Connecting to the research API…');

    try {
      await runResearchStream(ticker, secDataMode, handleEvent);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    error,
    isDraftReady,
    isLoading,
    result,
    stageStatuses,
    statusMessage,
    submitResearch,
  };
}
