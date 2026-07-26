import { useState } from 'react';

import { resumeResearchStream, runResearchStream } from '../lib/research-api';
import type {
  AnalystReport,
  HumanReviewDecision,
  HumanReviewRequest,
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
  humanApproval: 'Waiting for committee sign-off…',
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
  { id: 'humanApproval', label: 'Human sign-off', phase: 'Review' },
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
  const [approvalRequest, setApprovalRequest] = useState<{
    runId: string;
    request: HumanReviewRequest;
  }>();

  function handleEvent(event: ResearchEvent) {
    if (event.type === 'run.started') {
      setStatusMessage('API connected. Starting the research workflow…');
    } else if (event.type === 'run.interrupted') {
      setApprovalRequest({ runId: event.runId, request: event.request });
      setStatusMessage('Committee sign-off required before final synthesis.');
      setStageStatuses((current) => ({ ...current, humanApproval: 'active' }));
    } else if (event.type === 'run.resumed') {
      setStatusMessage(
        event.decision === 'reject'
          ? 'Ending the run without publishing a memo…'
          : 'Decision received. Resuming final synthesis…',
      );
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
      setApprovalRequest(undefined);
      setStatusMessage(
        event.result.status === 'rejected'
          ? 'Research ended without publishing a final memo.'
          : 'Research complete.',
      );
      setResult(event.result);
    } else if (event.type === 'run.failed') {
      setStatusMessage('Research stream failed.');
    }
  }

  async function submitResearch(ticker: string, secDataMode: SecDataMode) {
    setIsLoading(true);
    setError(undefined);
    setIsDraftReady(false);
    setApprovalRequest(undefined);
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

  async function reviewResearch(decision: HumanReviewDecision) {
    if (!approvalRequest) return;

    setIsLoading(true);
    setError(undefined);

    try {
      await resumeResearchStream(approvalRequest.runId, decision, handleEvent);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'The research run could not resume.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return {
    approvalRequest,
    error,
    isDraftReady,
    isLoading,
    result,
    stageStatuses,
    statusMessage,
    submitResearch,
    reviewResearch,
  };
}
