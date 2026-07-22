import { useEffect, useState } from 'react';

import { runResearch as requestResearch } from '../lib/research-api';
import type { ResearchPhaseId, ResearchResponse } from '../types/research';

const PHASES: ResearchPhaseId[] = ['validate', 'evidence', 'memo', 'verify'];

export function useResearch() {
  const [result, setResult] = useState<ResearchResponse>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [activePhase, setActivePhase] = useState<ResearchPhaseId>('validate');

  useEffect(() => {
    if (!isLoading) return;

    let phaseIndex = 0;
    setActivePhase(PHASES[phaseIndex]);
    const timer = window.setInterval(() => {
      phaseIndex = Math.min(phaseIndex + 1, PHASES.length - 1);
      setActivePhase(PHASES[phaseIndex]);
    }, 1_200);

    return () => window.clearInterval(timer);
  }, [isLoading]);

  async function submitResearch(ticker: string) {
    setIsLoading(true);
    setError(undefined);

    try {
      setResult(await requestResearch(ticker));
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : 'An unexpected error occurred.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  return { activePhase, error, isLoading, result, submitResearch };
}
