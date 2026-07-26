import type {
  AnalystReport,
  ChallengeReport,
  Fundamentals,
  MarketSnapshot,
  ResearchEvent,
  ResearchResponse,
  SecDataMode,
  Source,
} from '../types/research';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787';

function eventArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function runResearch(
  ticker: string,
  secDataMode: SecDataMode,
): Promise<ResearchResponse> {
  const response = await fetch(`${API_URL}/research`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticker, secDataMode }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Research could not be started.');
  }

  return response.json() as Promise<ResearchResponse>;
}

export async function runResearchStream(
  ticker: string,
  secDataMode: SecDataMode,
  onEvent: (event: ResearchEvent) => void,
): Promise<ResearchResponse> {
  const response = await fetch(`${API_URL}/research/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
    body: JSON.stringify({ ticker, secDataMode }),
  });

  if (!response.ok || !response.body) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? 'Research stream could not be started.');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let completedResult: ResearchResponse | undefined;

  function consumeEvent(block: string) {
    const lines = block.split('\n');
    const eventName = lines
      .find((line) => line.startsWith('event:'))
      ?.slice(6)
      .trim();
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).trim())
      .join('\n');
    if (!eventName || !data) return;

    const payload = JSON.parse(data) as Record<string, unknown>;
    if (eventName === 'run.completed') {
      completedResult = payload as unknown as ResearchResponse;
      onEvent({ type: 'run.completed', result: completedResult });
      return;
    }
    if (eventName === 'run.failed') {
      const message =
        typeof payload.message === 'string' ? payload.message : 'Research stream failed.';
      onEvent({ type: 'run.failed', message });
      throw new Error(message);
    }
    if (eventName === 'run.started' && typeof payload.ticker === 'string') {
      onEvent({
        type: 'run.started',
        ticker: payload.ticker,
        secDataMode: payload.secDataMode === 'fixture' ? 'fixture' : 'live',
      });
      return;
    }
    if (
      (eventName === 'stage.started' || eventName === 'stage.completed') &&
      typeof payload.stage === 'string'
    ) {
      onEvent({ type: eventName, stage: payload.stage });
      return;
    }
    if (eventName === 'sec.completed') {
      onEvent({
        type: 'sec.completed',
        companyName: typeof payload.companyName === 'string' ? payload.companyName : undefined,
        fundamentals: payload.fundamentals as Fundamentals | undefined,
        sources: eventArray<Source>(payload.sources),
        errors: eventArray<string>(payload.errors),
      });
      return;
    }
    if (eventName === 'market.completed') {
      onEvent({
        type: 'market.completed',
        snapshot: payload.snapshot as MarketSnapshot | undefined,
        sources: eventArray<Source>(payload.sources),
        errors: eventArray<string>(payload.errors),
      });
      return;
    }
    if (eventName === 'analyst.completed') {
      onEvent({
        type: 'analyst.completed',
        report: payload.report as AnalystReport | undefined,
        errors: eventArray<string>(payload.errors),
      });
      return;
    }
    if (eventName === 'draft.completed') {
      onEvent({
        type: 'draft.completed',
        errors: eventArray<string>(payload.errors),
      });
      return;
    }
    if (eventName === 'challenge.completed') {
      onEvent({
        type: 'challenge.completed',
        report: payload.report as ChallengeReport | undefined,
        errors: eventArray<string>(payload.errors),
      });
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    blocks.forEach(consumeEvent);
    if (done) break;
  }

  if (!completedResult) throw new Error('Research stream ended before a result was received.');
  return completedResult;
}
