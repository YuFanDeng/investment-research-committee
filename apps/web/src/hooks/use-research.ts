import { useState } from 'react';

import { runResearchStream } from '../lib/research-api';
import type {
  ResearchEvent,
  ResearchPhaseId,
  ResearchResponse,
  SecDataMode,
} from '../types/research';

const STAGE_PHASES: Record<string, ResearchPhaseId> = {
  validateTicker: 'validate',
  fetchSecFundamentals: 'evidence',
  fetchMarketData: 'evidence',
  fundamentalsAnalyst: 'memo',
  businessQualityAnalyst: 'memo',
  valuationAnalyst: 'memo',
  committeeDraft: 'memo',
  skepticChallenge: 'verify',
  committeeChair: 'verify',
};

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

export function useResearch() {
  const [result, setResult] = useState<ResearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [activePhase, setActivePhase] = useState<ResearchPhaseId>('validate');
  const [statusMessage, setStatusMessage] = useState('Ready to start research.');

  function handleEvent(event: ResearchEvent) {
    if (event.type === 'run.started') {
      setStatusMessage('API connected. Starting the research workflow…');
    } else if (event.type === 'stage.started') {
      setActivePhase(STAGE_PHASES[event.stage] ?? 'verify');
      setStatusMessage(STAGE_LABELS[event.stage] ?? `Working on ${event.stage}…`);
    } else if (event.type === 'stage.completed') {
      setStatusMessage(`${STAGE_LABELS[event.stage] ?? event.stage} complete.`);
    } else if (event.type === 'run.completed') {
      setStatusMessage('Research complete.');
    } else if (event.type === 'run.failed') {
      setStatusMessage('Research stream failed.');
    }
  }

  async function submitResearch(ticker: string, secDataMode: SecDataMode) {
    setIsLoading(true);
    setError(undefined);
    setStatusMessage('Connecting to the research API…');

    try {
      setResult(await runResearchStream(ticker, secDataMode, handleEvent));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { activePhase, error, isLoading, result, statusMessage, submitResearch };
}
